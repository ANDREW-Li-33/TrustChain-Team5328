## Setting up the project locally


1. clone the repository  
```git clone git@github.com:ANDREW-Li-33/TrustChain-Team5328.git```  

2. ```cd``` into the backend
3. install backend dependencies ```npm install```
4. start backend ```npm run dev```
5. go to frontend folder ```cd ../frontend```
6. install frontend dependencies```npm install```
7. run frontend ```npm run dev```
8. to view operator dashboard, open ```http://localhost:5173/operator```



### adding random mock jobs to the database
#### Note: there's currently no way implementation to clear the mock data through the script
1. cd into the backend folder
2. ```npm install```
3. ```npm run seed```


### viewing active jobs in the frontend
1. cd into the frontend
2. ```npm install```
3. create ```frontend/src/firebase/firebase.ts```
4. paste the following code into firebase.ts  
```
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
```
5. cd into the backend and run ```npm run dev```
6. cd into the frontend and run ```npm run dev```
7. open ```http://localhost:5173``` and log in (can use username: operator1@user.com, password: hello123)
8. open ```http://localhost:5173/jobs```

