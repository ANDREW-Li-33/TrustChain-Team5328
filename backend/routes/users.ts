import express from 'express';
import { addUser, getUsers, getUserByID} from '../database/users';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { firebaseUID, email, role, dateJoined, organizationName } = req.body;

        // Basic validation
        if (!firebaseUID || !email || !role) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/users.ts" });
        }

        const newUser = await addUser({
            firebaseUID,
            email,
            role,
            dateJoined,
            organizationName,
        });

        if (!newUser) {
            return res.status(500).json({ error: "Failed to insert user, error 2 in routes/users.ts" });
        }

        res.status(201).json({ message: "User added successfully", data: newUser });
    } catch (error) {
        console.error("Error in routes/users.js, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    const users = await getUsers();
    if (!users) {
        return res.status(500).json({ error: "Failed to fetch users" });
    }
    res.status(200).json(users);
});

router.get('/:id', async (req, res) => {
    const user = await getUserByID(Number(req.params.id));
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
});

export default router;