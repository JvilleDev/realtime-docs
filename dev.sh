#!/bin/bash

# Realtime Docs Development Script
# This script helps manage the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    if check_port $port; then
        print_warning "Killing process on port $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
}

# Function to start all services
start_all() {
    print_status "Starting all services..."
    
    # Kill existing processes
    kill_port 3000
    kill_port 3001
    
    # Start backend
    print_status "Starting backend (port 3001)..."
    cd packages/backend && bun src/index.ts &
    BACKEND_PID=$!
    
    # Start frontend
    print_status "Starting frontend (port 3000)..."
    cd ../../packages/frontend && bun dev &
    FRONTEND_PID=$!
    
    # Wait a moment for services to start
    sleep 5
    
    # Check if services are running
    if check_port 3000 && check_port 3001; then
        print_success "All services started successfully!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend: http://localhost:3001"
        print_status "Socket.IO: http://localhost:3001/socket.io/"
    else
        print_error "Some services failed to start"
        exit 1
    fi
}

# Function to stop all services
stop_all() {
    print_status "Stopping all services..."
    kill_port 3000
    kill_port 3001
    print_success "All services stopped"
}

# Function to build Docker images
build_docker() {
    print_status "Building Docker images..."
    docker-compose build
    print_success "Docker images built successfully"
}

# Function to start Docker services
start_docker() {
    print_status "Starting Docker services..."
    docker-compose up -d
    print_success "Docker services started"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:3001"
    print_status "Socket.IO: http://localhost:3001/socket.io/"
}

# Function to stop Docker services
stop_docker() {
    print_status "Stopping Docker services..."
    docker-compose down
    print_success "Docker services stopped"
}

# Function to show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose logs -f $service
    fi
}

# Function to show status
show_status() {
    print_status "Service Status:"
    echo ""
    
    if check_port 3000; then
        print_success "Frontend (3000): Running"
    else
        print_error "Frontend (3000): Not running"
    fi
    
    if check_port 3001; then
        print_success "Backend (3001): Running"
    else
        print_error "Backend (3001): Not running"
    fi
    
    print_status "Socket.IO collaboration is integrated into the backend"
}

# Function to show help
show_help() {
    echo "Realtime Docs Development Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services in development mode"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show status of all services"
    echo "  docker:build    Build Docker images"
    echo "  docker:start    Start Docker services"
    echo "  docker:stop     Stop Docker services"
    echo "  docker:restart  Restart Docker services"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start all services"
    echo "  $0 docker:start       # Start with Docker"
    echo "  $0 logs backend       # Show backend logs"
    echo "  $0 status             # Check service status"
}

# Main script logic
case "${1:-help}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        ;;
    status)
        show_status
        ;;
    docker:build)
        build_docker
        ;;
    docker:start)
        start_docker
        ;;
    docker:stop)
        stop_docker
        ;;
    docker:restart)
        stop_docker
        sleep 2
        start_docker
        ;;
    logs)
        show_logs $2
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
