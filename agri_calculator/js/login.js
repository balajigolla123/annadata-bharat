// Store OTP locally (front-end demo mode / backend fallback)
let generatedOtp = null;
// Current phone for which OTP was requested (used during verification)
let currentPhone = null;
// Current authenticated user object from MongoDB
let authenticatedUser = null;

// Helper: get & save registered users in localStorage (offline cache)
function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem("agriRegisteredUsers") || "[]");
  } catch (e) {
    return [];
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem("agriRegisteredUsers", JSON.stringify(users));
}



// Show sign in form
function showSignInForm(event) {
  if (event) event.preventDefault();
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signInForm").style.display = "block";
}

// Show create account form
function showCreateAccountForm(event) {
  if (event) event.preventDefault();
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
}

// Generate demo OTP for fast farmer testing
async function requestOtpForPhone(phone) {
  generatedOtp = Math.floor(100000 + Math.random() * 900000);
  console.log(`📱 Generated OTP for +91${phone}: ${generatedOtp}`);
  alert(`🌾 Verification OTP (Demo):\n\n${generatedOtp}\n\n(Enter this 6-digit code to complete login)`);
  return true;
}

// Handle phone submit (create account / register farmer profile in MongoDB)
async function handlePhoneSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("userName").value.trim();
  const phone = document.getElementById("userPhone").value.trim();
  const pincode = document.getElementById("userPincode").value.trim();

  if (!name || !phone || !pincode) {
    alert("Please fill all fields");
    return;
  }

  if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    alert("Please enter a valid 10-digit mobile number");
    return;
  }

  // Feature 3: Register farmer profile in MongoDB using PyMongo via API
  let mongoUser = null;
  if (window.AgriAPI) {
    try {
      const res = await window.AgriAPI.registerFarmer(name, phone, pincode);
      if (res && res.success && res.user) {
        mongoUser = res.user;
        authenticatedUser = res.user;
        console.log("✅ Farmer profile saved in MongoDB via PyMongo:", mongoUser);
      }
    } catch (err) {
      console.warn("MongoDB API sync warning, caching locally:", err);
    }
  }

  // Backup in local storage
  const users = getRegisteredUsers();
  const existingIdx = users.findIndex(u => u.phone === phone);
  const userObj = mongoUser || {
    name,
    phone,
    pincode,
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = userObj;
  } else {
    users.push(userObj);
  }
  saveRegisteredUsers(users);

  // Request OTP
  const ok = await requestOtpForPhone(phone);
  if (!ok) return;

  currentPhone = phone;
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("otpForm").style.display = "block";
  document.getElementById("displayPhone").innerText = "+91 " + phone;
}

// Handle sign in phone submit (authenticate farmer from MongoDB)
async function handleSignInPhoneSubmit(event) {
  event.preventDefault();
  const phone = document.getElementById("signInPhone").value.trim();
  if (!phone) {
    alert("Please enter your mobile number");
    return;
  }

  if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    alert("Please enter a valid 10-digit mobile number");
    return;
  }

  // Feature 3: Check farmer profile in MongoDB via PyMongo
  let userFound = false;
  if (window.AgriAPI) {
    try {
      const res = await window.AgriAPI.loginFarmer(phone);
      if (res && res.success && res.user) {
        authenticatedUser = res.user;
        userFound = true;
        console.log("✅ Farmer authenticated from MongoDB:", authenticatedUser);
      }
    } catch (err) {
      console.warn("MongoDB login check failed, falling back to local cache:", err);
    }
  }

  // Check local cache if not found in MongoDB
  if (!userFound) {
    const users = getRegisteredUsers();
    const existing = users.find(u => u.phone === phone);
    if (existing) {
      authenticatedUser = existing;
      userFound = true;
    }
  }

  if (!userFound) {
    alert("No farmer account found for this mobile number. Please create an account first.");
    showCreateAccountForm(event);
    document.getElementById("userPhone").value = phone;
    return;
  }

  // Request OTP
  const ok = await requestOtpForPhone(phone);
  if (!ok) return;

  currentPhone = phone;
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("otpForm").style.display = "block";
  document.getElementById("displayPhone").innerText = "+91 " + phone;
}

// Verify OTP
async function handleOtpVerify(event) {
  event.preventDefault();
  const enteredOtp = document.getElementById("otpInput").value.trim();

  if (!enteredOtp) {
    alert("Please enter the OTP");
    return;
  }

  if (!generatedOtp) {
    alert("No OTP generated. Please request OTP again.");
    return;
  }

  if (enteredOtp == generatedOtp) {
    alert("Login Successful ✅");

    const users = getRegisteredUsers();
    const existing = users.find(u => u.phone === currentPhone);

    const name = authenticatedUser?.name || existing?.name || document.getElementById("userName")?.value.trim() || "Farmer";
    const pincode = authenticatedUser?.pincode || existing?.pincode || document.getElementById("userPincode")?.value.trim() || "";
    const mongoId = authenticatedUser?.id || null;

    // Save active farmer session
    const sessionUser = {
      id: mongoId,
      name: name,
      phone: currentPhone,
      pincode: pincode,
      source: "mongodb_pymongo"
    };
    sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));

    // Redirect to calculator
    window.location.href = "index.html";
  } else {
    alert("Invalid OTP ❌ Please try again.");
  }
}

// Back button
function handleBackToForm() {
  if (document.getElementById("signInForm").style.display === "block") {
    document.getElementById("signInForm").style.display = "block";
    document.getElementById("otpForm").style.display = "none";
  } else {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("otpForm").style.display = "none";
  }
}
