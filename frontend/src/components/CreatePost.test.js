import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatePost from './CreatePost';
import { postsApi } from '../services/postsApi';

jest.mock('../services/postsApi', () => ({
  postsApi: {
    createPost: jest.fn(),
    getTimeline: jest.fn(),
    getTimelineByUserId: jest.fn(),
  },
}));

const mockOnPostCreated = jest.fn();

describe('CreatePost', () => {
  const mockSenderId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create post form', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    expect(screen.getByLabelText(/meddelande/i)).toBeInTheDocument();
    expect(screen.getByText(/publiceras offentligt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skapa inlägg/i })).toBeInTheDocument();
  });

  it('keeps submit button disabled when message is empty', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    expect(screen.getByRole('button', { name: /skapa inlägg/i })).toBeDisabled();
  });

  it('prevents input when message exceeds max length', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'a'.repeat(501) } });

    expect(messageInput.value.length).toBeLessThanOrEqual(500);
  });

  it('successfully creates a public post with valid input', async () => {
    postsApi.createPost.mockResolvedValue({
      id: 'post-id-123',
      senderId: mockSenderId,
      recipientId: mockSenderId,
      message: 'Test message',
      createdAt: new Date().toISOString(),
    });

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    fireEvent.change(screen.getByLabelText(/meddelande/i), { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /skapa inlägg/i }));

    await waitFor(() => {
      expect(postsApi.createPost).toHaveBeenCalledWith('Test message', null);
    });

    expect(mockOnPostCreated).toHaveBeenCalled();
    expect(screen.getByText(/inlägget skapades framgångsrikt/i)).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    postsApi.createPost.mockRejectedValueOnce(new Error('Kunde inte skapa inlägg'));

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    fireEvent.change(screen.getByLabelText(/meddelande/i), { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /skapa inlägg/i }));

    await waitFor(() => {
      expect(screen.getByText(/kunde inte skapa inlägg/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    postsApi.createPost.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    fireEvent.change(screen.getByLabelText(/meddelande/i), { target: { value: 'Test message' } });
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/skapar/i);
    });

    await waitFor(() => {
      expect(postsApi.createPost).toHaveBeenCalledWith('Test message', null);
    }, { timeout: 200 });
  });

  it('displays character count for message input', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    const testMessage = 'Test message';
    fireEvent.change(screen.getByLabelText(/meddelande/i), { target: { value: testMessage } });

    expect(screen.getByText(new RegExp(`${testMessage.length}.*500`, 'i'))).toBeInTheDocument();
  });

  it('clears form after successful post creation', async () => {
    postsApi.createPost.mockResolvedValueOnce({
      id: 'post-id-123',
      senderId: mockSenderId,
      recipientId: mockSenderId,
      message: 'Test message',
      createdAt: new Date().toISOString(),
    });

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);

    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /skapa inlägg/i }));

    await waitFor(() => {
      expect(postsApi.createPost).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(messageInput.value).toBe('');
    });
  });
});
