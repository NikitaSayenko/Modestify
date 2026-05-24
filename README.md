# Modestify

Modestify is a Hebrew RTL full stack web application for modest fashion discovery. The platform centralizes modest clothing items from multiple sources so users can browse relevant products in one place instead of manually searching through separate catalogs.

This project was developed as a final software engineering project. It demonstrates a complete web application flow, including product browsing, user authentication, favorites, cart management, order history, admin product management, and PayPal checkout integration.

## Features

- Hebrew RTL interface designed for a modest fashion audience
- Product browsing by categories and individual product pages
- User registration and login
- Favorites system for authenticated users
- Shopping cart functionality
- Order history for registered users
- Admin dashboard for managing products and approval status
- Cloud database integration for application data
- Backend server for external service communication
- PayPal checkout integration in development/sandbox mode

## Tech Stack

### Frontend

- React
- JavaScript
- React Router
- Bootstrap
- React Bootstrap
- CSS with RTL layout support

### Backend

- Node.js
- Express
- CORS
- dotenv
- node-fetch

### Database and Services

- Firebase Authentication
- Firebase Firestore
- Firebase Admin SDK
- PayPal API

### Tools

- Git
- GitHub
- npm
- VS Code


## Main Pages

The application includes the following main areas:

- Home page
- Categories page
- Category page
- Product page
- Login and registration pages
- Cart page
- User profile page
- Favorites page
- Order history page
- Admin dashboard

## Backend

The backend server is responsible for external service communication and order-related operations.

Main backend responsibilities:

- Creating checkout orders
- Capturing completed orders
- Saving order data to the database
- Communicating securely with external services from the server side

## Local Setup

Clone the repository:

```bash
git clone https://github.com/NikitaSayenko/Modestify.git
cd Modestify
```

Install dependencies:

```bash
npm install
```

Create a local environment file for the required development configuration. Runtime configuration values are intentionally not included in the repository.

Run the backend server:

```bash
node server.js
```

Run the React client in a second terminal:

```bash
npm start
```

The client runs on:

```text
http://localhost:3000
```

The backend runs on:

```text
http://localhost:4000
```

## Project Notes

- The project currently runs locally and does not have a public live demo yet.
- Runtime configuration should be stored locally and not committed to the repository.
- The application is built for Hebrew RTL usage.
- The project was created as a practical full stack final project and is still suitable for future improvement and deployment.

## Author

Nikita Sayenko  
GitHub: https://github.com/NikitaSayenko  
LinkedIn: https://www.linkedin.com/in/nikita-sayenko-b40606411/
