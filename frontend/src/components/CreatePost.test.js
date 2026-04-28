import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatePost from './CreatePost';
import * as postsApi from '../services/postsApi';

// Mock the API module
jest.mock('../services/postsApi');

const mockOnPostCreated = jest.fn();

describe('CreatePost', () => {
  const mockSenderId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create post form', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    expect(screen.getByLabelText(/mottagare-id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meddelande/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skapa inlägg/i })).toBeInTheDocument();
  });

  it('displays validation error when recipient ID is empty', async () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/mottagare-id är obligatoriskt/i)).toBeInTheDocument();
    });
  });

  it('displays validation error when recipient ID is not a valid GUID', async () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    fireEvent.change(recipientInput, { target: { value: 'invalid-guid' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/mottagare-id måste vara ett giltigt guid/i)).toBeInTheDocument();
    });
  });

  it('displays validation error when trying to post to own timeline', async () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    fireEvent.change(recipientInput, { target: { value: mockSenderId } });
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/du kan inte posta på din egen tidslinje/i)).toBeInTheDocument();
    });
  });

  it('displays validation error when message is empty', async () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    const validGuid = '223e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(recipientInput, { target: { value: validGuid } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/meddelande är obligatoriskt/i)).toBeInTheDocument();
    });
  });

  it('prevents input when message exceeds max length', async () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    const longMessage = 'a'.repeat(501);
    fireEvent.change(messageInput, { target: { value: longMessage } });

    // The component should prevent input beyond 500 characters
    expect(messageInput.value.length).toBeLessThanOrEqual(500);
  });

  it('successfully creates a post with valid input', async () => {
    const mockPostResponse = {
      id: 'post-id-123',
      senderId: mockSenderId,
      recipientId: '223e4567-e89b-12d3-a456-426614174000',
      message: 'Test message',
      createdAt: new Date().toISOString(),
    };

    postsApi.createPost.mockResolvedValue(mockPostResponse);

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    const validGuid = '223e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(recipientInput, { target: { value: validGuid } });
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(postsApi.createPost).toHaveBeenCalledWith(validGuid, 'Test message');
    });

    await waitFor(() => {
      expect(mockOnPostCreated).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/inlägget skapades framgångsrikt/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Kunde inte skapa inlägg';
    postsApi.createPost.mockRejectedValueOnce(new Error(errorMessage));

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    const validGuid = '223e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(recipientInput, { target: { value: validGuid } });
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    postsApi.createPost.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    const validGuid = '223e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(recipientInput, { target: { value: validGuid } });
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 200 });
  });

  it('displays character count for message input', () => {
    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    const testMessage = 'Test message';
    fireEvent.change(messageInput, { target: { value: testMessage } });

    expect(screen.getByText(new RegExp(`${testMessage.length}.*500`, 'i'))).toBeInTheDocument();
  });

  it('clears form after successful post creation', async () => {
    const mockPostResponse = {
      id: 'post-id-123',
      senderId: mockSenderId,
      recipientId: '223e4567-e89b-12d3-a456-426614174000',
      message: 'Test message',
      createdAt: new Date().toISOString(),
    };

    postsApi.createPost.mockResolvedValueOnce(mockPostResponse);

    render(<CreatePost senderId={mockSenderId} onPostCreated={mockOnPostCreated} />);
    
    const recipientInput = screen.getByLabelText(/mottagare-id/i);
    const validGuid = '223e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(recipientInput, { target: { value: validGuid } });
    
    const messageInput = screen.getByLabelText(/meddelande/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /skapa inlägg/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(postsApi.createPost).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(recipientInput.value).toBe('');
    });

    await waitFor(() => {
      expect(messageInput.value).toBe('');
    });
  });
});
