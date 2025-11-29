import express from 'express';
import {
  getMintingStatus,
  setMintingActive,
  setMintingInactive,
  getTransferStatus,
  setTransferActive,
  setTransferInactive,
  getRetireStatus,
  setRetireActive,
  setRetireInactive,
} from '../database/systemStatus';

const router = express.Router();


router.get('/minting', async (req, res) => {
  try {
    const isActive = await getMintingStatus();
    res.status(200).json({ active: isActive });
  } catch (error) {
    console.error('Error fetching minting status:', error);
    res.status(500).json({ error: 'Failed to fetch minting status' });
  }
});

router.post('/minting/activate', async (req, res) => {
  try {
    const result = await setMintingActive();
    if (result) {
      res.status(200).json({ message: 'Minting activated successfully', active: true });
    } else {
      res.status(500).json({ error: 'Failed to activate minting' });
    }
  } catch (error) {
    console.error('Error activating minting:', error);
    res.status(500).json({ error: 'Failed to activate minting' });
  }
});

router.post('/minting/deactivate', async (req, res) => {
  try {
    const result = await setMintingInactive();
    res.status(200).json({ message: 'Minting deactivated successfully', active: false });
  } catch (error) {
    console.error('Error deactivating minting:', error);
    res.status(500).json({ error: 'Failed to deactivate minting' });
  }
});

router.post('/minting/toggle', async (req, res) => {
  try {
    const currentStatus = await getMintingStatus();
    if (currentStatus) {
      await setMintingInactive();
      res.status(200).json({ message: 'Minting deactivated', active: false });
    } else {
      await setMintingActive();
      res.status(200).json({ message: 'Minting activated', active: true });
    }
  } catch (error) {
    console.error('Error toggling minting status:', error);
    res.status(500).json({ error: 'Failed to toggle minting status' });
  }
});


router.get('/transfer', async (req, res) => {
  try {
    const isActive = await getTransferStatus();
    res.status(200).json({ active: isActive });
  } catch (error) {
    console.error('Error fetching transfer status:', error);
    res.status(500).json({ error: 'Failed to fetch transfer status' });
  }
});

router.post('/transfer/activate', async (req, res) => {
  try {
    const result = await setTransferActive();
    if (result) {
      res.status(200).json({ message: 'Transfer activated successfully', active: true });
    } else {
      res.status(500).json({ error: 'Failed to activate transfer' });
    }
  } catch (error) {
    console.error('Error activating transfer:', error);
    res.status(500).json({ error: 'Failed to activate transfer' });
  }
});

router.post('/transfer/deactivate', async (req, res) => {
  try {
    const result = await setTransferInactive();
    if (result) {
      res.status(200).json({ message: 'Transfer deactivated successfully', active: false });
    } else {
      res.status(500).json({ error: 'Failed to deactivate transfer' });
    }
  } catch (error) {
    console.error('Error deactivating transfer:', error);
    res.status(500).json({ error: 'Failed to deactivate transfer' });
  }
});

router.post('/transfer/toggle', async (req, res) => {
  try {
    const currentStatus = await getTransferStatus();
    if (currentStatus) {
      await setTransferInactive();
      res.status(200).json({ message: 'Transfer deactivated', active: false });
    } else {
      await setTransferActive();
      res.status(200).json({ message: 'Transfer activated', active: true });
    }
  } catch (error) {
    console.error('Error toggling transfer status:', error);
    res.status(500).json({ error: 'Failed to toggle transfer status' });
  }
});


router.get('/retire', async (req, res) => {
  try {
    const isActive = await getRetireStatus();
    res.status(200).json({ active: isActive });
  } catch (error) {
    console.error('Error fetching retire status:', error);
    res.status(500).json({ error: 'Failed to fetch retire status' });
  }
});

router.post('/retire/activate', async (req, res) => {
  try {
    const result = await setRetireActive();
    if (result) {
      res.status(200).json({ message: 'Retire activated successfully', active: true });
    } else {
      res.status(500).json({ error: 'Failed to activate retire' });
    }
  } catch (error) {
    console.error('Error activating retire:', error);
    res.status(500).json({ error: 'Failed to activate retire' });
  }
});

router.post('/retire/deactivate', async (req, res) => {
  try {
    const result = await setRetireInactive();
    if (result) {
      res.status(200).json({ message: 'Retire deactivated successfully', active: false });
    } else {
      res.status(500).json({ error: 'Failed to deactivate retire' });
    }
  } catch (error) {
    console.error('Error deactivating retire:', error);
    res.status(500).json({ error: 'Failed to deactivate retire' });
  }
});

router.post('/retire/toggle', async (req, res) => {
  try {
    const currentStatus = await getRetireStatus();
    if (currentStatus) {
      await setRetireInactive();
      res.status(200).json({ message: 'Retire deactivated', active: false });
    } else {
      await setRetireActive();
      res.status(200).json({ message: 'Retire activated', active: true });
    }
  } catch (error) {
    console.error('Error toggling retire status:', error);
    res.status(500).json({ error: 'Failed to toggle retire status' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [mintingActive, transferActive, retireActive] = await Promise.all([
      getMintingStatus(),
      getTransferStatus(),
      getRetireStatus(),
    ]);

    res.status(200).json({
      minting: { active: mintingActive },
      transfer: { active: transferActive },
      retire: { active: retireActive },
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

export default router;