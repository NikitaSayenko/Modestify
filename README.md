# Modestify

[Live Demo](https://modestify-nikita.netlify.app/) | [GitHub Repository](https://github.com/NikitaSayenko/Modestify)

Modestify is a Hebrew RTL full stack web application for modest fashion discovery. The platform centralizes modest clothing items from multiple sources so users can browse relevant products in one place instead of manually searching through separate catalogs.

This project was developed as a final software engineering project. It demonstrates a complete web application flow, including product browsing, user authentication, favorites, cart management, order history, admin product management, and PayPal checkout integration.

## Live Demo

The deployed application is available at:

https://modestify-nikita.netlify.app/

- PayPal operates in Sandbox mode, so no real payment is processed.
- Visitors can register a regular user account and test browsing, authentication, favorites, cart, checkout, and order-history functionality.
- Admin and PayPal Sandbox credentials are intentionally not published to protect the demo data.
- Temporary test access may be provided privately upon request.

## Features

- Hebrew RTL interface designed for a modest fashion audience
- Product browsing by categories and individual product pages
- Search, filtering, and product availability handling
- User registration and login
- Favorites system for authenticated users
- Shopping cart functionality
- PayPal Sandbox checkout
- Order history and order details for registered users
- Admin dashboard for importing, approving, editing, and managing products
- Cloud database integration for application data
- Backend server for external service communication and order persistence

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

### Deployment

- Netlify - frontend hosting
- Render - backend hosting

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
- Search page
- Product page
- Login and registration pages
- Cart page
- User profile page
- Favorites page
- Order history and order details pages
- Admin dashboard, product editor, and reports

## Backend

The backend server is responsible for external service communication, protected product importing, and order-related operations.

Main backend responsibilities:

- Importing products from external APIs through an admin-protected endpoint
- Creating PayPal checkout orders
- Capturing completed PayPal orders
- Saving order data to Firestore
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

Create a local `.env` file for the required runtime configuration. Environment values and credentials are intentionally not included in the repository.

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

- The public demo is deployed with the frontend on Netlify and the backend on Render.
- PayPal is configured in Sandbox mode for demonstration purposes.
- Runtime configuration and secret credentials must be stored in environment variables and must not be committed to the repository.
- The application is built for Hebrew RTL usage.
- This is a portfolio and educational project and is not a production commerce service.

## Author

Nikita Sayenko  
GitHub: https://github.com/NikitaSayenko  
LinkedIn: https://www.linkedin.com/in/nikita-sayenko-b40606411/
