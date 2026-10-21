/**
 * Annadata Bharat - Farmer Authentication Controller
 * Direct Username & Password authentication with MongoDB and PyMongo.
 * Allows existing users to log in directly, or directs new users to sign in / create an account.
 */

// Toggle between Login and Sign Up forms
function showLoginForm() {
  const loginCard = document.getElementById("loginFormCard");
  const signUpCard = document.getElementById("signUpFormCard");
  if (loginCard) loginCard.style.display = "block";
  if (signUpCard) signUpCard.style.display = "none";
}

function showSignUpForm(prefillUsername = "") {
  const loginCard = document.getElementById("loginFormCard");
  const signUpCard = document.getElementById("signUpFormCard");
  if (loginCard) loginCard.style.display = "none";
  if (signUpCard) signUpCard.style.display = "block";

  if (prefillUsername) {
    const regUserInput = document.getElementById("regUsername");
    if (regUserInput) regUserInput.value = prefillUsername;
  }
}

// Handle Farmer Login
async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  // Attempt login via API client
  if (!window.AgriAPI) {
    alert("API Client not loaded. Please refresh the page.");
    return;
  }

  try {
    const res = await window.AgriAPI.loginFarmer(username, password);

    if (res && res.success && res.user) {
      const user = res.user;
      const sessionUser = {
        id: user.id || user._id,
        username: user.username || username,
        name: user.name || user.username || "Farmer",
        phone: user.phone || username,
        pincode: user.pincode || ""
      };
      sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));
      alert(`Login Successful ✅ Welcome, ${sessionUser.name}!`);
      window.location.href = "index.html";
      return;
    }

    if (res && res.not_found) {
      alert(`User "${username}" does not exist. Please sign up to create an account.`);
      showSignUpForm(username);
      return;
    }

    alert(res?.error || "Incorrect password. Please try again.");
  } catch (err) {
    console.error("Login submission error:", err);
    alert("Error logging in: " + err.message);
  }
}

// Handle Farmer Sign Up / Registration
async function handleSignUpSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const username = document.getElementById("regUsername").value.trim().toLowerCase();
  const phone = document.getElementById("regPhone").value.trim();
  const pincode = document.getElementById("regPincode").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!name || !username || !password) {
    alert("Full Name, Username, and Password are required.");
    return;
  }

  if (password.length < 4) {
    alert("Password must be at least 4 characters long.");
    return;
  }

  if (phone && (phone.length !== 10 || !/^\d{10}$/.test(phone))) {
    alert("Please enter a valid 10-digit mobile number, or leave it blank.");
    return;
  }

  if (!window.AgriAPI) {
    alert("API Client not loaded. Please refresh the page.");
    return;
  }

  try {
    const res = await window.AgriAPI.registerFarmer(name, username, phone, password, pincode);

    if (res && res.success && res.user) {
      const user = res.user;
      const sessionUser = {
        id: user.id || user._id,
        username: user.username || username,
        name: user.name || name,
        phone: user.phone || phone,
        pincode: user.pincode || pincode
      };
      sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));
      alert(`Account created successfully! ✅ Welcome, ${sessionUser.name}!`);
      window.location.href = "index.html";
      return;
    }

    if (res && res.exists) {
      alert(res.error || `Username "${username}" already exists. Please log in.`);
      showLoginForm();
      const loginUserInput = document.getElementById("loginUsername");
      if (loginUserInput) loginUserInput.value = username;
      return;
    }

    alert(res?.error || "Registration could not be completed. Please try again.");
  } catch (err) {
    console.error("Registration submission error:", err);
    alert("Error creating account: " + err.message);
  }
}
