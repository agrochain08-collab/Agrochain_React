<p align="center">
  <img src="https://ik.imagekit.io/a2wpi1kd9/imgToUrl/image-to-url_ThyEiMVLh" alt="AgroChain Logo" width="80"/>
</p>

<h1 align="center">AgroChain — Complete Project Schema</h1>

<p align="center">
  <strong>Agricultural Supply Chain Management Platform</strong><br/>
  <em>Empowering Every Node in Agricultural Supply Chain</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Express%205-000000?style=flat-square&logo=express" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/State-Redux%20Toolkit-764ABC?style=flat-square&logo=redux" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20Google%20OAuth-F4B400?style=flat-square&logo=jsonwebtokens" />
  <img src="https://img.shields.io/badge/Storage-Cloudinary-3448C5?style=flat-square&logo=cloudinary" />
</p>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Database Schemas (MongoDB/Mongoose)](#5-database-schemas-mongodbmongoose)
   - 5.1 [User Schema](#51-user-schema)
   - 5.2 [Order Schema (Farmer ↔ Dealer)](#52-order-schema-farmer--dealer)
   - 5.3 [RetailerOrder Schema (Dealer ↔ Retailer)](#53-retailerorder-schema-dealer--retailer)
   - 5.4 [Representative Schema](#54-representative-schema)
   - 5.5 [Log Schema](#55-log-schema)
6. [API Routes & Endpoints](#6-api-routes--endpoints)
   - 6.1 [Authentication Routes](#61-authentication-routes)
   - 6.2 [Farmer Routes](#62-farmer-routes)
   - 6.3 [Dealer Routes](#63-dealer-routes)
   - 6.4 [Retailer Routes](#64-retailer-routes)
   - 6.5 [Admin Routes](#65-admin-routes)
   - 6.6 [Representative Routes](#66-representative-routes)
7. [Middleware Layer](#7-middleware-layer)
8. [Frontend Architecture](#8-frontend-architecture)
   - 8.1 [Routing Map](#81-routing-map)
   - 8.2 [Redux Store Schema](#82-redux-store-schema)
   - 8.3 [Context API](#83-context-api)
   - 8.4 [Pages & Components](#84-pages--components)
9. [Entity Relationship Diagram](#9-entity-relationship-diagram)
10. [Supply Chain Workflow](#10-supply-chain-workflow)
11. [Environment Variables](#11-environment-variables)
12. [Deployment Architecture](#12-deployment-architecture)

---

## 1. Project Overview

**AgroChain** is a full-stack web application that digitizes and streamlines the agricultural supply chain. It connects **Farmers**, **Dealers** (wholesalers), **Retailers**, **Representatives** (field inspectors), and an **Admin** through a unified platform with role-based dashboards, real-time inventory tracking, bidding workflows, vehicle management, product verification, and comprehensive analytics.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Role Authentication** | Google OAuth 2.0 + Email OTP with JWT token-based sessions |
| **Product Verification Pipeline** | Farmer submits → Representative claims → Physical inspection → Approve/Reject |
| **Bidding System** | Dealer assigns vehicle → Places bid → Farmer accepts/rejects → Receipt generated |
| **Inventory Management** | Real-time stock tracking for Farmers, Dealers, and Retailers |
| **Vehicle Fleet Management** | Dealer registers vehicles, assigns to orders, tracks availability |
| **E-Commerce Flow** | Retailers browse dealer inventory → Cart → Checkout → Payment → Reviews |
| **Admin Analytics** | Pie charts, bar charts, user management, activity logs, product moderation |
| **Image Management** | Cloudinary integration for product/field images uploaded by representatives |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React 19)                             │
│  ┌──────────┐  ┌─────────┐  ┌────────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Farmer   │  │  Dealer │  │  Retailer  │  │  Admin  │  │   Rep   │ │
│  │Dashboard  │  │Dashboard│  │ Dashboard  │  │Dashboard│  │Dashboard│ │
│  └─────┬─────┘  └────┬────┘  └─────┬──────┘  └────┬────┘  └────┬────┘ │
│        │              │             │               │            │      │
│  ┌─────┴──────────────┴─────────────┴───────────────┴────────────┴───┐ │
│  │              Redux Store (auth, cart, notifications)               │ │
│  └──────────────────────────────┬────────────────────────────────────┘ │
│                                 │                                      │
│  ┌──────────────────────────────┴────────────────────────────────────┐ │
│  │          Axios API Service (JWT Interceptor, Base URL)            │ │
│  └──────────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ HTTPS (REST API)
┌─────────────────────────────────┼───────────────────────────────────────┐
│                     SERVER (Express 5 + Node.js)                        │
│  ┌──────────────────────────────┴────────────────────────────────────┐ │
│  │                   Middleware Pipeline                              │ │
│  │  CORS → Helmet → Morgan → JSON Parser → Auth → Role Check        │ │
│  └──────────────────────────────┬────────────────────────────────────┘ │
│                                 │                                      │
│  ┌────────┐ ┌────────┐ ┌───────┴──┐ ┌─────────┐ ┌──────┐ ┌────────┐ │
│  │  Auth  │ │ Farmer │ │  Dealer  │ │Retailer │ │Admin │ │  Rep   │ │
│  │ Routes │ │ Routes │ │  Routes  │ │ Routes  │ │Routes│ │ Routes │ │
│  └───┬────┘ └───┬────┘ └────┬─────┘ └────┬────┘ └──┬───┘ └───┬────┘ │
│      │          │           │             │          │         │      │
│  ┌───┴──────────┴───────────┴─────────────┴──────────┴─────────┴───┐ │
│  │                      Controllers Layer                          │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │                                    │
│  ┌──────────────────────────────┴──────────────────────────────────┐ │
│  │              Mongoose ODM (Models / Schemas)                    │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
         ┌────────────────────────┼──────────────────────┐
         │                        │                      │
   ┌─────┴──────┐    ┌───────────┴────────┐    ┌────────┴───────┐
   │  MongoDB   │    │    Cloudinary       │    │  Google OAuth  │
   │  Atlas     │    │  (Image Storage)    │    │  (Auth)        │
   │            │    │                     │    │                │
   │ • Users    │    │ • Product Images    │    │ • Token Verify │
   │ • Orders   │    │ • Field Photos      │    │ • Profile Data │
   │ • RetOrders│    │ • AgroChain_Crops/  │    │                │
   │ • Reps     │    │                     │    │                │
   │ • Logs     │    │                     │    │                │
   └────────────┘    └─────────────────────┘    └────────────────┘
```

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | 5.1.0 | HTTP server framework |
| **Mongoose** | 8.18.1 | MongoDB ODM |
| **JSON Web Token** | 9.0.3 | Authentication tokens |
| **Google Auth Library** | 10.3.0 | Google OAuth verification |
| **Nodemailer** | 7.0.6 | Email OTP dispatch |
| **Cloudinary** | 1.41.3 | Cloud image storage |
| **Multer** | 2.0.2 | Multipart file upload parsing |
| **Helmet** | 8.1.0 | HTTP security headers |
| **Morgan** | 1.10.1 | HTTP request logging |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 17.2.2 | Environment variable management |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI component library |
| **React Router DOM** | 7.9.6 | Client-side routing |
| **Redux Toolkit** | 2.11.0 | Global state management |
| **React Redux** | 9.2.0 | React bindings for Redux |
| **Axios** | 1.13.2 | HTTP client with interceptors |
| **@react-oauth/google** | 0.12.2 | Google Sign-In component |
| **Chart.js** | 4.5.1 | Data visualization |
| **react-chartjs-2** | 5.3.1 | Chart.js React wrapper |

---

## 4. Directory Structure

```
Agrochain_React/
│
├── backend/
│   ├── index.js                    # Server entry point
│   ├── app.js                      # Express app configuration
│   ├── package.json                # Backend dependencies
│   │
│   ├── config/
│   │   ├── db.js                   # MongoDB connection (Mongoose)
│   │   └── cloudinary.js           # Cloudinary + Multer configuration
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT token verification (protect)
│   │   └── roleMiddleware.js       # Role-based access control (authorize)
│   │
│   ├── models/
│   │   ├── user.js                 # User schema (Farmer, Dealer, Retailer)
│   │   ├── order.js                # Farmer↔Dealer order schema
│   │   ├── retailerOrder.js        # Dealer↔Retailer order schema
│   │   ├── representative.js       # Representative whitelist schema
│   │   └── log.js                  # Activity log schema
│   │
│   ├── controllers/
│   │   ├── authcontroller.js       # Signup, Login, OTP, Google Auth
│   │   ├── farmercontroller.js     # Crop CRUD, orders, bids, notifications
│   │   ├── dealercontroller.js     # Products, vehicles, bids, inventory
│   │   ├── retailercontroller.js   # Browse, cart, orders, payments, reviews
│   │   ├── admincontroller.js      # Stats, user mgmt, logs, products, reps
│   │   └── representativecontroller.js # Verification queue, approve/reject
│   │
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── farmer.js               # /api/farmer/*
│   │   ├── dealer.js               # /api/dealer/*
│   │   ├── retailer.js             # /api/retailer/*
│   │   ├── admin.js                # /api/admin/*
│   │   └── representative.js       # /api/representative/*
│   │
│   └── logs/
│       ├── access.log              # HTTP access logs (Morgan)
│       └── error.log               # Application error logs
│
└── frontend/
    └── agrochain-client/
        ├── package.json            # Frontend dependencies
        ├── public/
        │   └── index.html          # HTML entry point
        │
        └── src/
            ├── index.js            # React DOM render + Redux Provider
            ├── App.js              # Root router configuration
            ├── index.css           # Global styles
            ├── App.css             # App-level styles
            │
            ├── assets/css/
            │   ├── home.css        # Home + Navbar + Footer styles
            │   ├── about.css       # About page styles
            │   ├── login.css       # Login page styles
            │   ├── signup.css      # Signup page styles
            │   ├── error.css       # 404 Error page styles
            │   ├── farmer.css      # Farmer Dashboard styles
            │   ├── dealer.css      # Dealer Dashboard styles
            │   ├── retailer.css    # Retailer Dashboard styles
            │   └── admin.css       # Admin Dashboard styles
            │
            ├── components/
            │   ├── Navbar.jsx      # Public navigation bar
            │   ├── PublicNavbar.jsx # Alternative public navbar
            │   ├── Footer.jsx      # Public footer
            │   ├── ProtectedRoute.jsx # Auth + role guard wrapper
            │   └── ReviewModal.jsx # Shared review modal
            │
            ├── context/
            │   └── AuthContext.jsx  # Authentication context provider
            │
            ├── hooks/
            │   └── useAuth.jsx     # Custom authentication hook
            │
            ├── redux/
            │   ├── store.js        # Redux store configuration
            │   └── slices/
            │       ├── authSlice.js        # Auth state management
            │       ├── cartSlice.js        # Cart state management
            │       └── notificationSlice.js # Notification state management
            │
            ├── services/
            │   └── api.jsx         # Axios instance with interceptors
            │
            └── pages/
                ├── Home.jsx               # Landing page
                ├── About.jsx              # About page
                ├── Login.jsx              # Login (Google + OTP)
                ├── Signup.jsx             # Multi-step registration
                ├── Error.jsx              # 404 page
                ├── FarmerDashboard.jsx     # Farmer dashboard
                ├── DealerDashboard.jsx     # Dealer dashboard
                ├── RetailerDashboard.jsx   # Retailer dashboard
                ├── AdminDashboard.jsx      # Admin dashboard
                └── RepresentativeDashboard.jsx # Representative dashboard
```

---

## 5. Database Schemas (MongoDB/Mongoose)

### 5.1 User Schema

> **Collection:** `users` — Unified schema for all user roles (Farmer, Dealer, Retailer). Role-specific fields are conditionally populated.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          USER SCHEMA                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────── COMMON FIELDS ──────────────────────┐             │
│  │ role            : String  [farmer|dealer|retailer|admin] (required)  │
│  │ firstName       : String  (required)                    │             │
│  │ lastName        : String                                │             │
│  │ mobile          : String  (required)                    │             │
│  │ email           : String  (required, unique)            │             │
│  │ emailVerified   : Boolean (default: false)              │             │
│  │ googleAuth      : Boolean (default: false)              │             │
│  │ createdAt       : Date    (auto)                        │             │
│  │ updatedAt       : Date    (auto)                        │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                          │
│  ┌─────────────────── FARMER FIELDS ──────────────────────┐             │
│  │ aadhaar         : String  (12 digits)                   │             │
│  │ farmLocation    : String                                │             │
│  │ latitude        : Number                                │             │
│  │ longitude       : Number                                │             │
│  │ geoTag          : String                                │             │
│  │ farmSize        : String                                │             │
│  │ cropsGrown      : [String]                              │             │
│  │                                                         │             │
│  │ crops[]  ──────────────────────────────────────────┐    │             │
│  │ │ productType       : String (required)            │    │             │
│  │ │ varietySpecies     : String (required)            │    │             │
│  │ │ harvestQuantity    : Number (required)            │    │             │
│  │ │ unitOfSale         : String (required)            │    │             │
│  │ │ targetPrice        : Number (required)            │    │             │
│  │ │ availabilityStatus : String                       │    │             │
│  │ │ imageUrl           : String (set by rep)          │    │             │
│  │ │ dateAdded          : Date                         │    │             │
│  │ │ lastUpdated        : Date                         │    │             │
│  │ │ harvestDate        : Date                         │    │             │
│  │ │ farmerVillage      : String                       │    │             │
│  │ │ additionalNotes    : String                       │    │             │
│  │ │ batchId            : String                       │    │             │
│  │ │                                                   │    │             │
│  │ │ ── Verification Workflow ──                       │    │             │
│  │ │ verificationStatus : String                       │    │             │
│  │ │   [pending|claimed|in_verification|               │    │             │
│  │ │    approved|rejected]                             │    │             │
│  │ │ approvalStatus     : String                       │    │             │
│  │ │ claimedBy          : String (rep email)           │    │             │
│  │ │ claimedByName      : String (rep name)            │    │             │
│  │ │ claimedAt          : Date                         │    │             │
│  │ │                                                   │    │             │
│  │ │ ── Representative Data ──                         │    │             │
│  │ │ representativeImages : [String] (URLs)            │    │             │
│  │ │ fieldImages          : [String] (URLs)            │    │             │
│  │ │ expiryDate           : Date                       │    │             │
│  │ │                                                   │    │             │
│  │ │ qualityReport {}                                  │    │             │
│  │ │ │ grade            : String [A|B|C|D]             │    │             │
│  │ │ │ pesticidesUsed   : String                       │    │             │
│  │ │ │ storageCondition : String                       │    │             │
│  │ │ │ harvestCondition : String                       │    │             │
│  │ │ │ verifiedQuantity : Number                       │    │             │
│  │ │ │ remarks          : String                       │    │             │
│  │ │ │ inspectedBy      : String                       │    │             │
│  │ │ │ inspectedAt      : Date                         │    │             │
│  │ │                                                   │    │             │
│  │ │ reviews[] (from dealers)                          │    │             │
│  │ │ │ dealerEmail : String                            │    │             │
│  │ │ │ quality    : String [Excellent|Good|Avg|Poor]   │    │             │
│  │ │ │ comments   : String                             │    │             │
│  │ │ │ rating     : Number (1-5)                       │    │             │
│  │ │ │ date       : Date                               │    │             │
│  │ └──────────────────────────────────────────────────┘    │             │
│  │                                                         │             │
│  │ notifications[]                                         │             │
│  │ │ title          : String                               │             │
│  │ │ message        : String                               │             │
│  │ │ dealerDetails  : { name, email, businessName,         │             │
│  │ │                    mobile, address }                   │             │
│  │ │ productDetails : { name, quantity, price }            │             │
│  │ │ createdAt      : Date                                 │             │
│  │ │ read           : Boolean                              │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                          │
│  ┌─────────────────── DEALER FIELDS ──────────────────────┐             │
│  │ businessName        : String                            │             │
│  │ gstin               : String                            │             │
│  │ warehouseAddress    : String                            │             │
│  │ preferredCommodities: [String]                          │             │
│  │                                                         │             │
│  │ vehicles[]                                              │             │
│  │ │ vehicleId           : String (required)               │             │
│  │ │ vehicleType         : String (enum)                   │             │
│  │ │   [Reefer Truck (5MT)|Insulated Van (2MT)|            │             │
│  │ │    Inspection Van|Heavy Truck (10MT)]                 │             │
│  │ │ temperatureCapacity : String                          │             │
│  │ │ currentStatus       : String [AVAILABLE|ASSIGNED|     │             │
│  │ │                       MAINTENANCE]                    │             │
│  │ │ assignedTo          : { productId, productName,       │             │
│  │ │                        farmerEmail, farmerName,        │             │
│  │ │                        quantity, assignedDate }        │             │
│  │ │ dateAdded           : Date                            │             │
│  │                                                         │             │
│  │ inventory[]                                             │             │
│  │ │ productId       : String                              │             │
│  │ │ productName     : String                              │             │
│  │ │ productType     : String                              │             │
│  │ │ quantity        : Number                              │             │
│  │ │ unitPrice       : Number                              │             │
│  │ │ totalValue      : Number                              │             │
│  │ │ unitOfSale      : String                              │             │
│  │ │ imageUrl        : String                              │             │
│  │ │ farmerName      : String                              │             │
│  │ │ farmerEmail     : String                              │             │
│  │ │ receiptNumber   : String                              │             │
│  │ │ addedDate       : Date                                │             │
│  │ │ retailerReviews[] (from retailers)                    │             │
│  │ │   │ retailerEmail : String                            │             │
│  │ │   │ quality       : String                            │             │
│  │ │   │ comments      : String                            │             │
│  │ │   │ rating        : Number (1-5)                      │             │
│  │ │   │ date          : Date                              │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                          │
│  ┌─────────────────── RETAILER FIELDS ────────────────────┐             │
│  │ shopName              : String                          │             │
│  │ shopAddress           : String                          │             │
│  │ shopType              : String                          │             │
│  │ monthlyPurchaseVolume : String                          │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Order Schema (Farmer ↔ Dealer)

> **Collection:** `orders` — Tracks the lifecycle of a purchase from a Dealer to a Farmer, including vehicle assignment, bidding, and receipts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `dealerEmail` | String | required | Dealer placing the order |
| `farmerEmail` | String | required | Farmer receiving the order |
| `productId` | String | required | Reference to crop in farmer's crops[] |
| `vehicleId` | String | required | Assigned vehicle registration |
| `quantity` | Number | required | Ordered quantity |
| `totalAmount` | Number | required | Calculated total |
| `bidPrice` | Number | — | Dealer's bid price per unit |
| `originalPrice` | Number | — | Farmer's original target price |
| `bidStatus` | String | enum: `Pending`, `Accepted`, `Rejected` | Current bid state |
| `bidDate` | Date | — | When bid was placed |
| `bidResponseDate` | Date | — | When farmer responded |
| `status` | String | enum (see below) | Order lifecycle status |
| `receiptNumber` | String | — | Auto-generated on bid acceptance |
| `receiptGeneratedAt` | Date | — | Timestamp of receipt generation |
| `assignedDate` | Date | default: now | When vehicle was first assigned |
| `tentativeDate` | Date | — | Expected arrival |
| `pickupDate` | Date | — | Actual pickup |
| `deliveryDate` | Date | — | Actual delivery |
| `paymentStatus` | String | enum: `Pending`, `Completed`, `Failed` | Payment tracking |
| `pickupLocation` | Object | `{ address, latitude, longitude }` | Pickup coordinates |
| `deliveryLocation` | Object | `{ address, latitude, longitude }` | Delivery coordinates |
| `trackingNumber` | String | — | Logistics tracking |
| `timeline[]` | Array | `{ status, timestamp, notes }` | Audit trail |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Order Status Lifecycle:**

```
Vehicle Assigned → Bid Placed → Bid Accepted → In Transit → Delivered → Completed
                              → Bid Rejected
                                                                       → Cancelled
```

**Database Indexes:**

| Index | Fields | Purpose |
|-------|--------|---------|
| Dealer lookup | `{ dealerEmail: 1, assignedDate: -1 }` | Dealer's orders sorted by date |
| Farmer lookup | `{ farmerEmail: 1, assignedDate: -1 }` | Farmer's orders sorted by date |
| Status filter | `{ status: 1 }` | Filter by order status |
| Bid filter | `{ bidStatus: 1 }` | Filter by bid status |

---

### 5.3 RetailerOrder Schema (Dealer ↔ Retailer)

> **Collection:** `retailerorders` — Tracks orders placed by Retailers purchasing from Dealer inventory.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `retailerEmail` | String | required | Retailer placing the order |
| `dealerInfo` | Object | required | `{ email, businessName, warehouseAddress }` |
| `products[]` | Array | required | `[{ productId, productName, quantity, unitPrice }]` |
| `totalAmount` | Number | required | Sum of (qty × price) for all products |
| `shippingAddress` | String | required | Retailer's delivery address |
| `paymentDetails` | Object | — | `{ status: [Pending|Completed|Failed], method }` |
| `orderStatus` | String | enum: `Placed`, `Processing`, `Shipped`, `Delivered`, `Cancelled` | Order lifecycle |
| `reviewSubmitted` | Boolean | default: false | Whether retailer left a review |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

---

### 5.4 Representative Schema

> **Collection:** `representatives` — Admin-managed whitelist of emails authorized to access the Representative Dashboard.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `email` | String | required, unique, lowercase, trimmed | Representative's email |
| `addedBy` | String | default: `"admin"` | Admin who added the representative |
| `note` | String | default: `""` | Admin note about the representative |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

---

### 5.5 Log Schema

> **Collection:** `logs` — Activity log for admin monitoring and audit compliance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `userEmail` | String | required | User who performed the action |
| `actionType` | String | enum: `login`, `addProduct`, `orderPlaced`, `updateProfile`, `deleteUser`, `other` | Action category |
| `details` | String | — | Human-readable description |
| `timestamp` | Date | default: now | When the action occurred |

---

## 6. API Routes & Endpoints

> **Base URL:** `/api`  
> **Authentication:** Bearer JWT token via `Authorization` header  
> **Middleware:** `protect` (JWT verify) → `authorize(role)` (role check)

### 6.1 Authentication Routes

**Prefix:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/profile/:email` | `protect` | Get user profile by email |
| `POST` | `/signup` | Public | Register with email OTP verification |
| `POST` | `/send-otp` | Public | Send OTP to email (signup) |
| `POST` | `/verify-otp` | Public | Verify email OTP (signup) |
| `POST` | `/verify-google` | Public | Verify Google token (signup) |
| `POST` | `/signup-google` | Public | Register with Google OAuth |
| `POST` | `/send-login-otp` | Public | Send OTP to email (login) |
| `POST` | `/verify-login-otp` | Public | Verify OTP and return JWT (login) |
| `POST` | `/login-google` | Public | Login with Google credential |
| `PUT` | `/farmer/update/:email` | Public | Update farmer profile fields |

---

### 6.2 Farmer Routes

**Prefix:** `/api/farmer` — **Auth:** `protect` + `authorize('farmer')`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/profile/:email` | Get farmer profile |
| `PUT` | `/profile/:email` | Update farmer profile |
| `POST` | `/crops/:email` | Submit single crop for verification |
| `POST` | `/crops-bulk/:email` | Submit multiple crops (batch) |
| `GET` | `/crops/:email` | Get all crops for farmer |
| `PUT` | `/crops/:email/:id` | Edit crop (only if pending/rejected) |
| `DELETE` | `/crops/:email/:id` | Delete crop (only if pending/rejected) |
| `GET` | `/orders/:email` | Get all orders for farmer |
| `GET` | `/notifications/:email` | Get farmer notifications |
| `POST` | `/notifications/:email/mark-read` | Mark notifications as read |
| `POST` | `/accept-bid/:email` | Accept a dealer's bid → generates receipt |
| `POST` | `/reject-bid/:email` | Reject a dealer's bid |

---

### 6.3 Dealer Routes

**Prefix:** `/api/dealer` — **Auth:** `protect` + `authorize('dealer')`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/profile/:email` | Get dealer profile (includes inventory) |
| `PUT` | `/profile/:email` | Update dealer profile |
| `POST` | `/vehicles/:email` | Add vehicle to fleet |
| `GET` | `/vehicles/:email` | Get all vehicles |
| `PUT` | `/vehicles/:email/:vehicleId` | Update vehicle status |
| `DELETE` | `/vehicles/:email/:vehicleId` | Delete vehicle |
| `POST` | `/vehicles/free/:email/:vehicleId` | Free an assigned vehicle |
| `GET` | `/all-products` | Browse all approved farmer products |
| `POST` | `/assign-vehicle` | Assign vehicle to product → creates Order |
| `GET` | `/orders/:email` | Get dealer's orders (to farmers) |
| `POST` | `/place-bid` | Place bid on an order |
| `PUT` | `/inventory/update-price` | Update inventory item price |
| `PUT` | `/inventory/update-quantity` | Reduce inventory item quantity |
| `DELETE` | `/inventory/remove` | Remove inventory item |
| `GET` | `/retailer-orders/:email` | Get orders received from retailers |
| `GET` | `/farmer-profile/:farmerEmail` | View farmer details |

---

### 6.4 Retailer Routes

**Prefix:** `/api/retailer` — **Auth:** `protect` + `authorize('retailer')`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dealer-inventory` | Browse all dealer inventories |
| `POST` | `/place-order` | Place order from cart items |
| `GET` | `/orders/:email` | Get retailer's orders |
| `PUT` | `/orders/:orderId` | Update order details |
| `POST` | `/orders/:orderId/complete-payment` | Process payment for order |
| `POST` | `/submit-review` | Submit review for a product/dealer |
| `PUT` | `/profile/:email` | Update retailer profile |

---

### 6.5 Admin Routes

**Prefix:** `/api/admin` — **Auth:** `protect` + `authorize('admin')`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Platform-wide analytics (users, orders, revenue, charts) |
| `GET` | `/users` | List all registered users |
| `DELETE` | `/users/:id` | Permanently delete a user |
| `PUT` | `/deactivate/:id` | Toggle user active/inactive |
| `GET` | `/logs` | Get all activity logs |
| `GET` | `/products` | Get all products across all farmers |
| `DELETE` | `/products/:farmerEmail/:cropId` | Admin delete a product |
| `GET` | `/representatives` | List all representatives |
| `POST` | `/representatives` | Add a new representative |
| `DELETE` | `/representatives/:id` | Remove a representative |
| `GET` | `/representatives/check/:email` | *(Public)* Check if email is a representative |

---

### 6.6 Representative Routes

**Prefix:** `/api/representative` — **Auth:** `protect`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/pending` | Get unassigned verification queue |
| `POST` | `/claim/:batchId` | Claim a batch for verification |
| `POST` | `/unclaim/:batchId` | Release batch back to queue |
| `GET` | `/my-assigned` | Get batches assigned to this rep |
| `GET` | `/crops?status=` | Get crops by status (`approved`, `rejected`, etc.) |
| `GET` | `/expiry-alerts?days=14` | Get products expiring within N days |
| `PUT` | `/edit/:farmerEmail/:cropId` | Edit crop during verification |
| `PUT` | `/approve/:farmerEmail/:cropId` | Approve crop (multipart: images + data) |
| `PUT` | `/reject/:farmerEmail/:cropId` | Reject crop with reason |
| `PUT` | `/admin-edit/:farmerEmail/:cropId` | Post-approval edit (expiry, remarks, deactivate) |

---

## 7. Middleware Layer

### 7.1 Authentication Middleware (`authMiddleware.js`)

```
Request → Extract Bearer Token → jwt.verify(token, JWT_SECRET) → Attach decoded user to req.user → next()
```

| Scenario | Response |
|----------|----------|
| Valid token | `req.user = { email, role, ... }` → proceeds |
| Invalid/expired token | `401 — Not authorized, token failed` |
| No token provided | `401 — Not authorized, no token` |

### 7.2 Role Middleware (`roleMiddleware.js`)

```
Request → Check req.user.role ∈ allowedRoles → next() OR 403
```

| Scenario | Response |
|----------|----------|
| Role is in allowed list | Proceeds to controller |
| Role not authorized | `403 — Role (X) is not authorized to access this route` |

### 7.3 Middleware Pipeline (app.js)

```
Incoming Request
  ↓
  CORS (origin whitelist)
  ↓
  Helmet (security headers)
  ↓
  Morgan (access logging → logs/access.log)
  ↓
  express.json() (body parsing)
  ↓
  Route Matching (/api/auth, /api/farmer, etc.)
  ↓
  protect middleware (JWT)
  ↓
  authorize middleware (role check)
  ↓
  Controller Logic
  ↓
  Response / Error Handler
```

---

## 8. Frontend Architecture

### 8.1 Routing Map

| Path | Component | Guard | Access |
|------|-----------|-------|--------|
| `/` | `Home` | — | Public |
| `/about` | `About` | — | Public |
| `/login` | `Login` | — | Public |
| `/signup` | `Signup` | — | Public |
| `/farmer` | `FarmerDashboard` | `ProtectedRoute(['farmer'])` | Farmer only |
| `/dealer` | `DealerDashboard` | `ProtectedRoute(['dealer'])` | Dealer only |
| `/retailer` | `RetailerDashboard` | `ProtectedRoute(['retailer'])` | Retailer only |
| `/admin` | `AdminDashboard` | `ProtectedRoute(['admin'])` | Admin only |
| `/representative` | `RepresentativeDashboard` | — (checked via API) | Rep whitelist |
| `*` | `Error` | — | Public (404) |

### 8.2 Redux Store Schema

```javascript
{
  auth: {
    user: {                         // User object from login response
      email: String,
      firstName: String,
      lastName: String,
      role: String,                 // farmer | dealer | retailer | admin
      // ... role-specific fields
    },
    token: String,                  // JWT token
    isAuthenticated: Boolean,
    loading: Boolean,
    error: String | null
  },

  cart: {
    items: [                        // Cart items (role-scoped via localStorage key)
      {
        _id: String,
        varietySpecies: String,      // (dealer cart) or productName (retailer cart)
        productType: String,
        quantity: Number,
        targetPrice: Number,        // (dealer) or unitPrice (retailer)
        imageUrl: String,
        farmerEmail: String,        // (dealer cart only)
        // ... additional product fields
      }
    ],
    totalItems: Number,
    totalAmount: Number
  },

  notification: {
    notifications: [
      {
        id: String,
        title: String,
        message: String,
        dealerDetails: Object,
        productDetails: Object,
        createdAt: Date,
        read: Boolean
      }
    ],
    unreadCount: Number,
    loading: Boolean,
    error: String | null
  }
}
```

**Redux Actions:**

| Slice | Actions |
|-------|---------|
| `auth` | `loginStart`, `loginSuccess`, `loginFailure`, `logout`, `updateProfile` |
| `cart` | `initializeCart`, `addToCart`, `removeFromCart`, `updateCartQuantity`, `clearCart` |
| `notification` | `setNotifications`, `addNotification`, `markAsRead`, `markAllAsRead`, `clearNotifications` |

### 8.3 Context API

**AuthContext** provides:

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `user` | Object | Current user from Redux store |
| `token` | String | JWT token |
| `isAuthenticated` | Boolean | Login status |
| `loading` | Boolean | Initial hydration state |
| `login(userData, token)` | Function | Persist & dispatch login |
| `logout()` | Function | Clear all storage & dispatch logout |
| `updateUserProfile(data)` | Function | Partial profile update |

### 8.4 Pages & Components

| Page | Internal Sections | Modals |
|------|-------------------|--------|
| **Home** | Hero, Impact Cards, Features, Roles, CTA, Footer | — |
| **About** | Header, Story, Mission/Vision, Team Grid, Footer | — |
| **Login** | Google OAuth Button, Email+OTP Form, Timer | — |
| **Signup** | 4-Step Wizard: Basic Info → Verification → Role → Details | — |
| **Error** | 404 Code, Message, Go Home Button | — |
| **FarmerDashboard** | Inventory (product form + cards), Orders (bid panel), Notifications, Profile | Receipt Modal |
| **DealerDashboard** | Browse (filters + grid), Cart, Orders, Inventory, Vehicles, Retailer Orders, Stats, Profile | Farmer Info, Assign Vehicle, Place Bid, Receipt, Quality Report, View Reviews, Edit Profile, Retailer Receipt |
| **RetailerDashboard** | Browse (filters + grid), Cart + Checkout, Orders, Profile | Payment (2-step), Receipt, Review, View Reviews, Edit Profile |
| **AdminDashboard** | Analytics (stats + charts), User Management, Products, Activity Logs, Representatives | — |
| **RepresentativeDashboard** | Stats Bar, Queue Tab, My Verifications Tab, Approved Tab, Rejected Tab | Approve/Inspect, Reject, Post-Approval Edit |

---

## 9. Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│ REPRESENTATIVE│ ◄───── │     ADMIN       │ ──────► │     LOG      │
│             │  manages │                 │  creates │              │
│ • email     │         │ • email (fixed) │         │ • userEmail  │
│ • addedBy   │         │ • role: admin   │         │ • actionType │
│ • note      │         │                 │         │ • details    │
└──────┬──────┘         └────────┬────────┘         └──────────────┘
       │ inspects                │ oversees
       ▼                         │
┌──────────────┐                 │
│   FARMER     │ ◄───────────────┘
│              │
│ • crops[]    │──────── crops submitted for verification ──► REPRESENTATIVE
│ • notifs[]   │
│ • profile    │
└──────┬───────┘
       │ sells to (via bidding)
       │
       ▼
┌──────────────┐
│    ORDER     │  (Farmer ↔ Dealer transaction)
│              │
│ • farmerEmail│
│ • dealerEmail│
│ • productId  │
│ • vehicleId  │
│ • bidPrice   │
│ • status     │
│ • receipt    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   DEALER     │
│              │
│ • vehicles[] │──────── fleet management
│ • inventory[]│──────── stock from accepted bids
│ • profile    │
└──────┬───────┘
       │ sells to (e-commerce)
       │
       ▼
┌────────────────┐
│ RETAILER ORDER │  (Dealer ↔ Retailer transaction)
│                │
│ • retailerEmail│
│ • dealerInfo   │
│ • products[]   │
│ • paymentInfo  │
│ • orderStatus  │
└──────┬─────────┘
       │
       ▼
┌──────────────┐
│  RETAILER    │
│              │
│ • shopName   │
│ • shopAddress│
│ • profile    │
└──────────────┘
```

---

## 10. Supply Chain Workflow

```
STEP 1: PRODUCT SUBMISSION
  Farmer → Submits crop details (single or bulk)
  Status: PENDING

STEP 2: VERIFICATION
  Representative → Claims batch from queue
  Status: CLAIMED → IN_VERIFICATION
  Representative → Physical inspection at farm
  Representative → Uploads product images, field photos
  Representative → Fills quality report (grade, qty, etc.)
  Representative → APPROVES or REJECTS

  IF APPROVED:
    Status: APPROVED
    Product listed on marketplace with images & quality data
  IF REJECTED:
    Status: REJECTED (farmer notified, can edit & resubmit)

STEP 3: DEALER PROCUREMENT
  Dealer → Browses approved products on marketplace
  Dealer → Adds to cart → Orders from cart
  Dealer → Assigns vehicle from fleet to the order
  Status: VEHICLE ASSIGNED
  Dealer → Places bid (price per unit)
  Status: BID PLACED

STEP 4: FARMER RESPONSE
  Farmer → Receives bid notification
  Farmer → ACCEPTS or REJECTS bid

  IF ACCEPTED:
    Status: BID ACCEPTED
    Receipt auto-generated (unique receipt number)
    Farmer's crop quantity reduced
    Product added to Dealer's inventory
    Farmer receives payment notification
  IF REJECTED:
    Status: BID REJECTED
    Vehicle freed, dealer can re-bid

STEP 5: RETAIL DISTRIBUTION
  Retailer → Browses dealer inventories
  Retailer → Adds products to cart
  Retailer → Places order (checkout)
  Retailer → Completes payment (UPI/Card/NetBanking)
  Dealer inventory quantities reduced
  Retailer can view receipt & submit reviews

STEP 6: ADMIN MONITORING (throughout)
  Admin → Monitors analytics (users, orders, revenue)
  Admin → Manages user accounts (activate/deactivate/delete)
  Admin → Moderates products (delete inappropriate listings)
  Admin → Reviews activity logs
  Admin → Manages representative whitelist
```

---

## 11. Environment Variables

> **File:** `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `EMAIL_USER` | Yes | Gmail address for Nodemailer |
| `EMAIL_PASS` | Yes | Gmail app password for Nodemailer |
| `GOOGLE_CLIENT_ID` | Recommended | Google OAuth 2.0 client ID |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `PORT` | No | Server port (default: 3000) |

---

## 12. Deployment Architecture

| Component | Platform | URL |
|-----------|----------|-----|
| **Frontend** | Vercel | `https://agrochain-teal.vercel.app` |
| **Backend** | Render | `https://agrochain-i1h0.onrender.com` |
| **Database** | MongoDB Atlas | Cloud-hosted cluster |
| **Image CDN** | Cloudinary | `AgroChain_Crops/` folder |
| **OAuth** | Google Cloud Console | OAuth 2.0 credentials |

### CORS Allowed Origins

```
https://agrochain-teal.vercel.app
https://agrochain-i1h0.onrender.com
http://localhost:3000
http://localhost:3001
http://localhost:5000
http://localhost:5500
```

---

<p align="center">
  <strong>AgroChain</strong> &copy; 2025 — IIIT Sri City<br/>
  <em>Built with transparency. Powered by technology. Driven by trust.</em>
</p>
