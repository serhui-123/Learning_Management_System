const mongoose = require('mongoose');

// 1. Define the schema first
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    password: { type: String, required: true } // Make sure this is here!
});

// 2. Export the model using the schema defined above
// Check your line 10: ensure you use 'userSchema' (lowercase 'u') 
// if that is what you named it above.
module.exports = mongoose.model('User', userSchema);