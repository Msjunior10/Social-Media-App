import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Wall from './Wall';
import * as wallApi from '../services/wallApi';

// Mock the API module
jest.mock('../services/wallApi');

describe('Wall', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockPosts = [
    {
      id: 'post-1',
      senderId: 'sender-1',
      recipientId: null,
      message: 'First wall post',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'post-2',
      senderId: 'sender-2',
      recipientId: null,
      message: 'Second wall post',
      createdAt: '2024-01-16T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    wallApi.getWall.mockImplementation(() => new Promise(() => {}));
    
    render(<Wall userId={mockUserId} />);
    
    expect(screen.getByText(/vägg/i)).toBeInTheDocument();
    expect(screen.getByText(/laddar vägg/i)).toBeInTheDocument();
  });

  it('fetches and displays posts', async () => {
    wallApi.getWall.mockResolvedValue(mockPosts);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(wallApi.getWall).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('First wall post')).toBeInTheDocument();
      expect(screen.getByText('Second wall post')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Kunde inte hämta vägg';
    wallApi.getWall.mockRejectedValue(new Error(errorMessage));

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /försök igen/i })).toBeInTheDocument();
  });

  it('displays empty message when no posts are available', async () => {
    wallApi.getWall.mockResolvedValue([]);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/inga inlägg från följda användare att visa/i)).toBeInTheDocument();
      expect(screen.getByText(/följ användare för att se deras inlägg här/i)).toBeInTheDocument();
    });
  });

  it('displays posts sorted by date (newest first)', async () => {
    const sortedPosts = [...mockPosts].reverse();
    wallApi.getWall.mockResolvedValue(sortedPosts);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      const postElements = screen.getAllByText(/wall post/i);
      expect(postElements.length).toBeGreaterThan(0);
    });
  });

  it('retries fetching when retry button is clicked', async () => {
    const errorMessage = 'Kunde inte hämta vägg';
    wallApi.getWall
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockPosts);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /försök igen/i });
    retryButton.click();

    await waitFor(() => {
      expect(wallApi.getWall).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('First wall post')).toBeInTheDocument();
    });
  });

  it('does not fetch when userId is not provided', () => {
    render(<Wall userId={null} />);

    expect(wallApi.getWall).not.toHaveBeenCalled();
  });

  it('displays formatted dates for posts', async () => {
    wallApi.getWall.mockResolvedValue(mockPosts);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      const dateElements = screen.getAllByText(/2024/i);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('displays sender ID for posts', async () => {
    wallApi.getWall.mockResolvedValue(mockPosts);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/från: sender-1/i)).toBeInTheDocument();
      expect(screen.getByText(/från: sender-2/i)).toBeInTheDocument();
    });
  });

  it('displays recipient ID when present', async () => {
    const postsWithRecipient = [
      {
        id: 'post-1',
        senderId: 'sender-1',
        recipientId: 'recipient-1',
        message: 'Post with recipient',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];

    wallApi.getWall.mockResolvedValue(postsWithRecipient);

    render(<Wall userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/till: recipient-1/i)).toBeInTheDocument();
    });
  });
});
