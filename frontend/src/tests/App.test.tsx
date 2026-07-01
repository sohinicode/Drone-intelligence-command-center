import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock Zustand store since we are testing render logic in isolation
jest.mock('../store', () => ({
  useStore: () => ({
    isAuthenticated: false,
    login: jest.fn(),
    register: jest.fn(),
    activeTab: 'dashboard',
    token: null,
    user: null,
    fetchNotifications: jest.fn()
  })
}));

// Mock Geospatial Leaflet component to avoid ES module import compilation errors
jest.mock('../pages/Geospatial', () => ({
  Geospatial: () => <div data-testid="mock-geospatial">Mock Geospatial Map</div>
}));

describe('DICC Frontend Render Tests', () => {
  it('should render the login card when unauthenticated', () => {
    render(<App />);
    
    // Check if the Title header is loaded
    expect(screen.getByText(/DRONE INTELLIGENCE/i)).toBeInTheDocument();
    
    // Check if form input labels exist
    expect(screen.getByText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    
    // Check if demo quick pass triggers exist
    expect(screen.getByText(/Demo Quick Access Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspector/i)).toBeInTheDocument();
    expect(screen.getByText(/Engineer/i)).toBeInTheDocument();
  });
});
