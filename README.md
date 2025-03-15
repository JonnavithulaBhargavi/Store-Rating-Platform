Store Rating Platform
Overview
The Store Rating Platform is a comprehensive web application that allows users to submit and view ratings for registered stores. The platform features a role-based access control system, providing different functionalities for system administrators, normal users, and store owners.
Tech Stack

Backend: Express.js
Database: PostgreSQL
Frontend: React.js
Authentication: JWT (JSON Web Tokens)

Features
User Roles

System Administrator

Manage stores and users
View system analytics and statistics
Access comprehensive dashboard


Normal User

Browse and search for stores
Submit ratings (1-5 stars)
Update previously submitted ratings
Manage personal profile


Store Owner

View store performance metrics
Monitor customer ratings
Access store-specific analytics



Key Functionalities
System Administrator

Add new stores and users
View dashboard with system statistics
Manage user roles and permissions
Filter and search through all data

Normal User

User registration and authentication
Store browsing and searching
Rating submission and modification
Password management

Store Owner

Store performance monitoring
Customer rating analytics
Profile management

Database Schema
The application uses a relational database with the following main entities:

Users (with role differentiation)
Stores
Ratings

Installation and Setup
Prerequisites

Node.js (v14.x or higher)
PostgreSQL (v13.x or higher)
npm or yarn

Backend Setup

Clone the repository
Copygit clone https://github.com/username/store-rating-platform.git
cd store-rating-platform/backend

Install dependencies
Copynpm install

Set up environment variables
Copycp .env.example .env
Edit .env file with your database credentials and JWT secret
Run database migrations
Copynpm run migrate

Start the server
Copynpm run dev


Frontend Setup

Navigate to the frontend directory
Copycd ../frontend

Install dependencies
Copynpm install

Start the development server
Copynpm start


API Endpoints
Authentication

POST /api/auth/register - Register a new user
POST /api/auth/login - User login

Users

GET /api/users - Get all users (Admin only)
GET /api/users/:id - Get user details
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user

Stores

GET /api/stores - Get all stores
GET /api/stores/:id - Get store details
POST /api/stores - Add new store (Admin only)
PUT /api/stores/:id - Update store (Admin only)
DELETE /api/stores/:id - Delete store (Admin only)

Ratings

GET /api/ratings - Get all ratings
POST /api/ratings - Add new rating
PUT /api/ratings/:id - Update rating
DELETE /api/ratings/:id - Delete rating

Form Validations

Name: Min 20 characters, Max 60 characters
Address: Max 400 characters
Password: 8-16 characters, must include at least one uppercase letter and one special character
Email: Standard email validation
