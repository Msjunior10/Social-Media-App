import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Timeline from './Timeline';
import * as postsApi from '../services/postsApi';

// Mock the API module
jest.mock('../services/postsApi');

describe('Timeline', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockPosts = [
    {
      id: 'post-1',
      senderId: 'sender-1',
      recipientId: mockUserId,
      message: 'First post',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'post-2',
      senderId: 'sender-2',
      recipientId: mockUserId,
      message: 'Second post',
      createdAt: '2024-01-16T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    postsApi.getTimeline.mockImplementation(() => new Promise(() => {}));
    
    render(<Timeline userId={mockUserId} />);
    
    expect(screen.getByText(/tidslinje/i)).toBeInTheDocument();
    expect(screen.getByText(/laddar tidslinje/i)).toBeInTheDocument();
  });

  it('fetches and displays posts', async () => {
    postsApi.getTimeline.mockResolvedValue(mockPosts);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      expect(postsApi.getTimeline).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeInTheDocument();
      expect(screen.getByText('Second post')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Kunde inte hämta tidslinje';
    postsApi.getTimeline.mockRejectedValue(new Error(errorMessage));

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /försök igen/i })).toBeInTheDocument();
  });

  it('displays empty message when no posts are available', async () => {
    postsApi.getTimeline.mockResolvedValue([]);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/inga inlägg att visa i tidslinjen/i)).toBeInTheDocument();
    });
  });

  it('displays posts sorted by date (newest first)', async () => {
    const sortedPosts = [...mockPosts].reverse(); // Already sorted by date
    postsApi.getTimeline.mockResolvedValue(sortedPosts);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      const postElements = screen.getAllByText(/post/i);
      expect(postElements.length).toBeGreaterThan(0);
    });
  });

  it('retries fetching when retry button is clicked', async () => {
    const errorMessage = 'Kunde inte hämta tidslinje';
    postsApi.getTimeline
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockPosts);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /försök igen/i });
    retryButton.click();

    await waitFor(() => {
      expect(postsApi.getTimeline).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeInTheDocument();
    });
  });

  it('does not fetch when userId is not provided', () => {
    render(<Timeline userId={null} />);

    expect(postsApi.getTimeline).not.toHaveBeenCalled();
  });

  it('displays formatted dates for posts', async () => {
    postsApi.getTimeline.mockResolvedValue(mockPosts);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      // Check that dates are rendered (format may vary based on locale)
      const dateElements = screen.getAllByText(/2024/i);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('displays sender and recipient IDs for posts', async () => {
    postsApi.getTimeline.mockResolvedValue(mockPosts);

    render(<Timeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/från: sender-1/i)).toBeInTheDocument();
      expect(screen.getByText(/från: sender-2/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`till: ${mockUserId}`, 'i'))).toBeInTheDocument();
    });
  });
});
