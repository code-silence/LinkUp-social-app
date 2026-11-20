# LinkUp — Social Media Platform

**Your world, closer together.**

LinkUp is a social media web application built with React Native and Firebase. It provides a place to connect with friends, share posts, interact with your community, and chat in real time.

# **Live Website:** [https://linkup-social-app.stellar-dev.workers.dev/](https://linkup-social-app.stellar-dev.workers.dev/)

---

## Features

- **Authentication** — Create an account, log in, and securely manage your session.
- **User Profiles** — Customize your profile with a photo, cover image, bio, and personal information.
- **Friends** — Send and receive friend requests, manage connections, and discover people.
- **News Feed** — Share posts and view updates from your community.
- **Post Reactions** — React to posts and see how others interact with them.
- **Comments** — Join conversations through post comments.
- **Notifications** — Get notified about friend requests, reactions, and comments.
- **Real-time Messaging** — Chat privately with accepted friends.
- **Responsive Design** — Enjoy LinkUp on desktop and mobile devices.

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native | Frontend application |
| TypeScript | Type safety |
| React Native Web | Web compatibility |
| Vite | Development server and production build |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database and real-time updates |
| Cloudinary | Image uploads |
| Lucide React Native | Icons |
| Cloudflare Workers | Deployment and hosting |

## Screenshots

<!-- Add project screenshots here -->

## Getting Started

### Prerequisites

- Node.js
- npm
- A Firebase project
- A Cloudinary account

### 1. Clone the repository

```bash
git clone https://github.com/code-silence/LinkUp-social-app.git
cd LinkUp-social-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Configure your Firebase project credentials in `src/services/firebase.ts`.

### 4. Start the development server

```bash
npm run web
```

The application will be available at the local development URL shown in your terminal.

## Production Build

Create a production build:

```bash
npm run build:web
```

## Deployment

LinkUp is deployed using Cloudflare Workers.

To deploy updates manually:

```bash
npm run build:web
npx wrangler deploy
```

## Project Structure

```text
LinkUp/
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   └── logo.png
│   ├── components/
│   ├── screens/
│   ├── services/
│   └── theme.ts
├── App.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.mts
└── ...
```

## Contributors

Developed collaboratively by:

- [code-silence](https://github.com/code-silence)
- Project collaborator

## License

This project is currently developed as a portfolio and learning project. All rights reserved unless a license is added to this repository.
