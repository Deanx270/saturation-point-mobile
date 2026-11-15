# The Saturation Point

ITCP239: Programming Language - Design and Implementation

## Overview
"The Saturation Point" is a mobile e-commerce application for fountain pens, bottled inks, and fine stationery built with React Native, Expo, Redux Toolkit, and Express.

## Architecture
- Mobile Framework: React Native with Expo
- State Architecture: Redux Toolkit (Products, Orders, Reviews, Cart, Auth)
- Offline Storage: SQLite (`expo-sqlite`) for active cart, Expo SecureStore for JWT
- Navigation: Drawer Navigator, Bottom Tab Navigator, Native Stack
- Device Services: Camera, Gallery Image Picker, Push Notifications, Haptics
- Backend: Node.js, Express, REST API (requires environment configuration via `.env`)

## Project Structure
- `mobile`: React Native Expo mobile application
- `backend`: Node.js and Express API server
