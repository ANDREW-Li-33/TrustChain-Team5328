import { supabase } from '../supabaseClient.js';
import { addJob } from '../database/jobs.js';
import { addUser } from '../database/users.js';

const tools = [
  { id: 101, name: 'Vapor Recovery Unit VRU-2000' },
  { id: 102, name: 'Flare Gas Recovery System FGR-500' },
  { id: 103, name: 'Methane Capture Device MCD-300' },
  { id: 104, name: 'Carbon Sequestration Unit CSU-1000' },
  { id: 105, name: 'Energy Recovery Turbine ERT-750' },
  { id: 106, name: 'Leak Detection System LDS-200' },
  { id: 107, name: 'Gas Compression Unit GCU-400' },
  { id: 108, name: 'Waste Heat Recovery WHR-600' }
];

const operators = [
  { firebaseUID: 1001, email: 'chevron.ops@example.com', name: 'Chevron Operations' },
  { firebaseUID: 1002, email: 'shell.field@example.com', name: 'Shell Field Services' },
  { firebaseUID: 1003, email: 'bp.energy@example.com', name: 'BP Energy Systems' },
  { firebaseUID: 1004, email: 'exxon.prod@example.com', name: 'ExxonMobil Production' },
  { firebaseUID: 1005, email: 'conoco.wells@example.com', name: 'ConocoPhillips Wells' }
];

const locations = [
  'Permian Basin, TX',
  'Eagle Ford, TX', 
  'Bakken Formation, ND',
  'Marcellus Shale, PA',
  'Denver-Julesburg Basin, CO',
  'Gulf of Mexico Platform A-12',
  'Alaska North Slope',
  'Anadarko Basin, OK',
  'Haynesville Shale, LA',
  'Utica Shale, OH'
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateJobDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

async function seedOperators() {
  console.log(' Creating mock operators...');
  
  const createdOperators = [];
  for (const op of operators) {
    const user = await addUser({
      firebaseUID: op.firebaseUID,
      email: op.email,
      role: 'Operator',
      dateJoined: generateJobDate(randomBetween(180, 365))
    });
    
    if (user) {
      createdOperators.push(user[0]);
      console.log(`Created operator: ${op.name} (ID: ${user[0].userID})`);
    }
  }
  
  return createdOperators;
}

async function seedJobs(operatorUsers: any[]) {
  console.log(' Creating mock jobs...');
  
  const jobPromises = [];
  const jobDetails = []; // Store for console output
  
  // Create 30 mock jobs
  for (let i = 0; i < 30; i++) {
    const operator = randomElement(operatorUsers);
    const tool = randomElement(tools);
    const daysAgo = randomBetween(0, 120);
    
    // Determine status based on age and random chance
    let status: 'Active' | 'Completed' | 'Paused';
    if (daysAgo > 60) {
      // Older jobs are more likely to be completed
      const roll = Math.random();
      if (roll < 0.7) status = 'Completed';
      else if (roll < 0.9) status = 'Active';
      else status = 'Paused';
    } else if (daysAgo > 30) {
      // Medium age jobs
      const roll = Math.random();
      if (roll < 0.4) status = 'Completed';
      else if (roll < 0.8) status = 'Active';
      else status = 'Paused';
    } else {
      // Recent jobs are mostly active
      const roll = Math.random();
      if (roll < 0.1) status = 'Completed';
      else if (roll < 0.85) status = 'Active';
      else status = 'Paused';
    }
    
    const location = randomElement(locations);
    const co2Saved = randomBetween(50, 5000) / 10; // 5.0 to 500.0 tons
    const runtime = randomBetween(24, 720); // 1 to 30 days in hours
    const efficiency = randomBetween(850, 990) / 10; // 85.0% to 99.0%
    
    const jobData = {
      operatorID: operator.userID,
      toolID: tool.id,
      status: status,
      dateCreated: generateJobDate(daysAgo)
    };
    
    jobDetails.push({
      tool: tool.name,
      location,
      co2Saved,
      runtime,
      efficiency,
      operator: operators.find(op => op.firebaseUID === operator.firebaseUID)?.name,
      status,
      daysAgo
    });
    
    jobPromises.push(addJob(jobData));
  }
  
  const results = await Promise.all(jobPromises);
  
  // log some sample jobs for reference
  console.log('\n Sample jobs created:');
  results.slice(0, 5).forEach((job, index) => {
    if (job && job[0]) {
      const details = jobDetails[index];
      console.log(`   Job #${job[0].jobID}:`);
      console.log(`     - Tool: ${details.tool}`);
      console.log(`     - Location: ${details.location}`);
      console.log(`     - Status: ${details.status}`);
      console.log(`     - CO₂ Saved: ${details.co2Saved.toFixed(1)} tons`);
      console.log(`     - Efficiency: ${details.efficiency.toFixed(1)}%`);
      console.log(`     - Operator: ${details.operator}`);
      console.log('');
    }
  });
  
  return results.filter(r => r !== null).length;
}

async function seedDatabase() {
  console.log('🚀 Starting database seeding...\n');
  
  try {

    const operatorUsers = await seedOperators();
    
    if (operatorUsers.length === 0) {
      throw new Error('Failed to create operators');
    }
    
    console.log(`Created ${operatorUsers.length} operators\n`);
    
    // Create mock jobs
    const jobCount = await seedJobs(operatorUsers);
    
    console.log(`\n Successfully seeded database with:`);
    console.log(`   - ${operatorUsers.length} operators`);
    console.log(`   - ${jobCount} jobs`);
    console.log('\n Database seeding complete!');
    
    
  } catch (error) {
    console.error(' Error seeding database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// run the function
seedDatabase();