import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileCard } from './ProfileCard'

describe('ProfileCard', () => {
  it('renders every prop', () => {
    render(
      <ProfileCard
        name="Grace Hopper"
        bio="Built the first compiler."
        image="https://example.com/grace.png"
        field="Compilers"
        year={1952}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByAltText('Grace Hopper')).toHaveAttribute('src', 'https://example.com/grace.png')
    expect(screen.getByText('Built the first compiler.')).toBeInTheDocument()
    expect(screen.getByText('Compilers')).toBeInTheDocument()
    expect(screen.getByText('Active 1952')).toBeInTheDocument()
  })
})
