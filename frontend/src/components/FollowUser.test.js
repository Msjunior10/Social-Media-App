import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUser from './FollowUser';
import * as followApi from '../services/followApi';

// Mock the API module
jest.mock('../services/followApi');

describe('FollowUser', () => {
  const mockFollowerId = '123e4567-e89b-12d3-a456-426614174000';
  const mockFollowingId = '223e4567-e89b-12d3-a456-426614174000';
  const mockOnFollowChange = jest.fn();

  const mockFollowingList = [
    {
      id: 'follow-1',
      followerId: mockFollowerId,
      followingId: mockFollowingId,
      createdAt: '2024-01-15T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state while checking follow status', () => {
    followApi.getFollowing.mockImplementation(() => new Promise(() => {}));
    
    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);
    
    expect(screen.getByText(/kontrollerar status/i)).toBeInTheDocument();
  });

  it('displays follow button when user is not following', async () => {
    followApi.getFollowing.mockResolvedValue([]);

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });
  });

  it('displays unfollow button when user is following', async () => {
    followApi.getFollowing.mockResolvedValue(mockFollowingList);

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    });
  });

  it('calls followUser API when follow button is clicked', async () => {
    followApi.getFollowing.mockResolvedValue([]);
    followApi.followUser.mockResolvedValue({
      id: 'follow-1',
      followerId: mockFollowerId,
      followingId: mockFollowingId,
      createdAt: '2024-01-15T10:00:00Z',
    });

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button', { name: /följ/i });
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followApi.followUser).toHaveBeenCalledWith(mockFollowingId);
    });
  });

  it('calls unfollowUser API when unfollow button is clicked', async () => {
    followApi.getFollowing.mockResolvedValue(mockFollowingList);
    followApi.unfollowUser.mockResolvedValue(undefined);

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    });

    const unfollowButton = screen.getByRole('button', { name: /avfölj/i });
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(followApi.unfollowUser).toHaveBeenCalledWith(mockFollowingId);
    });
  });

  it('calls onFollowChange callback when following user', async () => {
    followApi.getFollowing.mockResolvedValue([]);
    followApi.followUser.mockResolvedValue({
      id: 'follow-1',
      followerId: mockFollowerId,
      followingId: mockFollowingId,
      createdAt: '2024-01-15T10:00:00Z',
    });

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button', { name: /följ/i });
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(mockOnFollowChange).toHaveBeenCalledWith(true);
    });
  });

  it('calls onFollowChange callback when unfollowing user', async () => {
    followApi.getFollowing.mockResolvedValue(mockFollowingList);
    followApi.unfollowUser.mockResolvedValue(undefined);

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    });

    const unfollowButton = screen.getByRole('button', { name: /avfölj/i });
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(mockOnFollowChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Kunde inte följa användare';
    followApi.getFollowing.mockResolvedValue([]);
    followApi.followUser.mockRejectedValue(new Error(errorMessage));

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button', { name: /följ/i });
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    followApi.getFollowing.mockResolvedValue([]);
    followApi.followUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button', { name: /följ/i });
    fireEvent.click(followButton);

    expect(screen.getByRole('button', { name: /följer/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    });
  });

  it('does not check follow status when followerId or followingId is missing', () => {
    render(<FollowUser followerId={null} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    expect(followApi.getFollowing).not.toHaveBeenCalled();
  });

  it('does not check follow status when followingId is missing', () => {
    render(<FollowUser followerId={mockFollowerId} followingId={null} onFollowChange={mockOnFollowChange} />);

    expect(followApi.getFollowing).not.toHaveBeenCalled();
  });

  it('updates button state after successfully following', async () => {
    followApi.getFollowing.mockResolvedValue([]);
    followApi.followUser.mockResolvedValue({
      id: 'follow-1',
      followerId: mockFollowerId,
      followingId: mockFollowingId,
      createdAt: '2024-01-15T10:00:00Z',
    });

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    });

    const followButton = screen.getByRole('button', { name: /följ/i });
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('updates button state after successfully unfollowing', async () => {
    followApi.getFollowing.mockResolvedValue(mockFollowingList);
    followApi.unfollowUser.mockResolvedValue(undefined);

    render(<FollowUser followerId={mockFollowerId} followingId={mockFollowingId} onFollowChange={mockOnFollowChange} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /avfölj/i })).toBeInTheDocument();
    });

    const unfollowButton = screen.getByRole('button', { name: /avfölj/i });
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /följ/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
