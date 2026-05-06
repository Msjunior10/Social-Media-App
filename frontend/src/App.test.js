import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app', () => {
  render(<App />);
  const heading = screen.getByText(/Postra/i);
  expect(heading).toBeInTheDocument();
});