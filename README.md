# Pizza Hub Server

## 1. Project Name

**Pizza Hub Server**

## 2. Project Description

Pizza Hub Server is the backend API for the Pizza Hub food ordering platform. It manages pizza menus, vendors, customers, orders, payments, and role-based access for users, vendors, and admins.

The API provides public menu endpoints and protected endpoints for menu management, order processing, payment verification, and administrative operations.

## 3. Technology, Packages, and Libraries

- **Runtime:** Node.js
- **Language:** JavaScript (ES Modules)
- **Backend Framework:** Express.js
- **Database:** MongoDB
- **MongoDB Driver:** `mongodb`
- **Payment Service:** Stripe
- **Authentication:** JOSE JWT verification with remote JWKs
- **Environment Variables:** `dotenv`
- **Cross-Origin Requests:** `cors`
- **Deployment:** Vercel Node.js functions

### Main npm Packages

| Package | Purpose |
|---|---|
| `express` | Build the HTTP API server and routes |
| `mongodb` | Connect to MongoDB and perform database operations |
| `cors` | Enable cross-origin resource sharing |
| `dotenv` | Load environment variables from a `.env` file |
| `jose` | Verify authentication JWTs using remote JWKs |
| `stripe` | Create and verify Stripe payment sessions |

## 4. Where We Get the API

- The API is implemented in this server project, primarily in `index.js`.
- Run it locally at `http://localhost:8000` or on the port set in `PORT`.
- MongoDB data is retrieved from the MongoDB database configured by `DB_URI`. The database used by this project is `pizza_hub`.
- Authentication keys are obtained from the client application's JWKS endpoint configured by `CLIENT_URL`, at `/api/auth/jwks`.
- Stripe payment information is obtained through the Stripe API using `STRIPE_SECRET_KEY`.
- The server can also be deployed to Vercel using `vercel.json`.

## 5. How to Set Up This Project Locally

### Prerequisites

- Node.js and npm installed
- A MongoDB database and connection URI
- A Stripe secret key
- A running client application that provides `/api/auth/jwks`

### Installation

1. Clone the project and enter the server directory:

   ```bash
   git clone <repository-url>
   cd pizzahub_server
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add:

   ```env
   DB_URI=your_mongodb_connection_uri
   STRIPE_SECRET_KEY=your_stripe_secret_key
   CLIENT_URL=http://localhost:3000
   PORT=8000
   ```

   - `DB_URI`: MongoDB connection string.
   - `STRIPE_SECRET_KEY`: Secret key from the Stripe Dashboard.
   - `CLIENT_URL`: Base URL of the Pizza Hub client application.
   - `PORT`: Optional; the server uses port `8000` by default.

4. Start the server:

   ```bash
   npm start
   ```

5. Open `http://localhost:8000` in a browser. A successful response should show:

   ```text
   Ready with your pizza
   ```