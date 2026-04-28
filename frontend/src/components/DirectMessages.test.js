import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DirectMessages from './DirectMessages';

// Mock child components
let renderCount = 0;

jest.mock('./DirectMessagesList', () => {
  return function MockDirectMessagesList({ userId }) {
    renderCount++;
    return <div data-testid="direct-messages-list" data-render-count={renderCount}>DirectMessagesList - UserId: {userId}</div>;
  };
});

jest.mock('./SendDirectMessage', () => {
  return function MockSendDirectMessage({ senderId, onMessageSent }) {
    return (
      <div data-testid="send-direct-message">
        SendDirectMessage - SenderId: {senderId}
        <button onClick={onMessageSent}>Send Message</button>
      </div>
    );
  };
});

describe('DirectMessages', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    renderCount = 0;
  });

  it('renders SendDirectMessage and DirectMessagesList components', () => {
    render(<DirectMessages userId={mockUserId} />);

    expect(screen.getByTestId('send-direct-message')).toBeInTheDocument();
    expect(screen.getByTestId('direct-messages-list')).toBeInTheDocument();
  });

  it('passes userId to child components', () => {
    render(<DirectMessages userId={mockUserId} />);

    expect(screen.getByText(new RegExp(`SenderId: ${mockUserId}`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`UserId: ${mockUserId}`, 'i'))).toBeInTheDocument();
  });

  it('refreshes DirectMessagesList when message is sent', () => {
    render(<DirectMessages userId={mockUserId} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    const initialList = screen.getByTestId('direct-messages-list');
    const initialRenderCount = initialList.getAttribute('data-render-count');

    act(() => {
      sendButton.click();
    });

    const updatedList = screen.getByTestId('direct-messages-list');
    const updatedRenderCount = updatedList.getAttribute('data-render-count');

    // The component should have re-rendered (refreshKey incremented)
    expect(updatedRenderCount).not.toBe(initialRenderCount);
  });

  it('calls onMessageSent callback when message is sent', () => {
    render(<DirectMessages userId={mockUserId} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });

    act(() => {
      sendButton.click();
    });

    // Component should re-render with new key
    expect(renderCount).toBeGreaterThan(1);
  });
});
