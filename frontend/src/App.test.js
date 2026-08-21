import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the Paperly tools navigation', () => {
  render(<App />)
  expect(screen.getByRole('button', { name: /^tools$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^recent$/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /^github$/i })).toBeInTheDocument()
})
