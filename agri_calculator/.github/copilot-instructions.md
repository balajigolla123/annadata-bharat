# AI Coding Agent Instructions: Agriculture Calculator

## Project Overview
**Smart Fertilizer & Irrigation Calculator** - A web application with user authentication that recommends crop-specific fertilizer dosages and irrigation schedules based on:
- Crop type (rice, wheat, maize, cotton, tomato, groundnut, sugarcane)
- Soil characteristics (type and texture)
- Optional soil test NPK/micro-nutrient values
- Farm area (hectares) and sowing date

## Architecture

### Page Structure
- **login.html** - User registration and authentication (protected entry point)
- **index.html** - Main calculator (requires active session)
- All pages protected: missing `currentUser` in sessionStorage redirects to login

### Authentication Flow
1. **Registration**: Collect name, mobile (10-digit), pincode (6-digit)
2. **OTP Generation**: Generate random 6-digit OTP (logged to console for testing)
3. **OTP Verification**: User enters OTP to verify ownership
4. **Account Creation**: Save user to localStorage (`agricUsers` array) with metadata
5. **Session Management**: Valid login stores user in sessionStorage as `currentUser`
6. **Login Flow**: Existing users can sign in with mobile + OTP verification

### Data Flow - Calculator
1. **User Input** → Form collects crop, area, soil, dates, and optional soil test values
2. **Calculation Engine** → `calculate()` function processes inputs:
   - Retrieves base NPK values from crop lookup table
   - Adjusts based on soil test values (if provided) using `adjustValue()`
   - Applies soil texture multipliers (sandy +5-15%, clay -5-15%)
   - Identifies micro-nutrient deficiencies (Zn, Fe, B, Cu)
3. **Output Generation** → Creates HTML tables for:
   - Organic fertilizer dosages (dynamic count based on crop)
   - Chemical fertilizer alternatives with "OR" options
   - Weekly irrigation schedule with volume calculations

### Key Data Structures

**User Object** (localStorage and sessionStorage):
```javascript
{
  id: timestamp,
  name: "User Name",
  phone: "9876543210",
  pincode: "123456",
  createdAt: ISO timestamp,
  lastLogin: ISO timestamp
}
```

**Base NPK Reference** (`script.js` lines 37-46):
```javascript
base: {
  rice: {N:120, P:60, K:60, organicDosages:2, chemicalDosages:3},
  // ... crop-specific values
}
```

**Irrigation Schedule** (`script.js` lines 127-135):
```javascript
irrigationData: {
  rice: {days:"Mon, Wed, Fri", litresPerDay:300000},
  // ... per-crop water requirements
}
```

## Critical Implementation Patterns

### Login & Authentication (`js/login.js`)
- **OTP Generation**: `generateOtp()` creates random 6-digit string (console logged for testing)
- **Account Validation**: Check existing accounts via `getUserByPhone()`
- **Persistent Storage**: All users saved to `localStorage.agricUsers` (survives page reload)
- **Session Storage**: Current user in `sessionStorage.currentUser` (cleared on tab close)
- **Modes**: Login vs. registration handled via `sessionStorage.loginMode` flag

### Calculator Adjustments (`js/script.js`, post-auth lines)
- **Soil test-based adjustment** (`adjustValue()`, lines 183-187): Values >= upper threshold → 70% of base; mid-range → 85%; low → 100%
- **Soil texture multipliers** (lines 56-58): Applied AFTER soil test adjustments; affects all three NPK values
- **Micro-nutrient detection** (lines 60-65): Compares soil values against crop-specific thresholds (Zn<0.6, Fe<4, B<0.3, Cu<0.3)

### Validation Requirements
- **Login**: Name required, phone 10-digit numeric, pincode 6-digit numeric
- **Calculator**: All required fields (crop, soilType, soilTexture, sowingDate, area) must be filled
- **Area**: Must be numeric and > 0
- **Optional fields**: Parsed as NaN if empty (safe to skip)

### Table Generation Strategy
- **Dynamic dosages**: Split fertilizer quantities evenly across crop-specific dosage counts
- **Organic** (pre-sowing focus): First dose at -15 days, then spaced by 15-day intervals
- **Chemical** (sowing onward): First dose at day 0, then 15-day intervals
- **Fertilizer alternatives**: Show both DAP/Urea and Ammonium/TSP/MOP options separated by "OR"

## Styling Conventions

**Color scheme**: Green gradient palette (#1b5e20 primary, #43a047 secondary)
- **Header**: Gradient green with white text (sticky, z-index: 100)
- **Login page**: Centered card with slideUp animation
- **Calculator grid**: 2-column responsive grid (1-column on mobile ≤768px)
- **Soil section**: Distinguished with dashed border and light lime background
- **Results**: Displayed in green-tinted box with left border accent
- **Tables**: Inline styling with `border-collapse:collapse`, centered text
- **Messages**: Error (red, #ffcdd2) and success (green, #c8e6c9) with animations

## Common Development Tasks

### Adding a New Crop
1. Add crop option to HTML `<select id="crop">` (index.html, lines 19-27)
2. Add base NPK entry to `base` object (script.js, line 37)
3. Add irrigation schedule (script.js, line 127)

### Adjusting Fertilizer Recommendations
- **Base values**: Edit `base[cropName]` properties
- **Soil multipliers**: Modify lines 56-58 for texture-based adjustments
- **Micro-nutrient thresholds**: Edit conditions in lines 60-65
- **Alternative fertilizers**: Update chemical table template (lines 118-124)

### Modifying Dosage Schedules
- **Organic**: Change loop interval at line 87 (`Math.floor(i * 15)`)
- **Chemical**: Change loop interval at line 108 (`Math.floor(i * 15)`)

### Adding OTP Integration (Backend)
- Replace `console.log()` calls in `login.js` with actual API endpoint
- Send OTP via SMS gateway (Twilio, AWS SNS, etc.)
- Modify OTP alert to remove test OTP display
- Ensure phone number validation against country codes if expanding internationally

## File Dependencies
- **login.html**: Authentication UI; entry point for new users
- **index.html**: Calculator form + user header with logout
- **css/style.css**: Main styles + user header styles
- **css/login.css**: Login page responsive design
- **js/login.js**: Authentication logic, account management
- **js/script.js**: Calculator + session validation on load
- **No external libraries** - pure vanilla HTML/CSS/JS

## Testing Considerations
- **OTP Testing**: Check browser console for generated OTP (displayed for demo)
- **Persistent Users**: Create test accounts; verify localStorage `agricUsers` survives reload
- **Session Timeout**: sessionStorage clears on tab close; verify redirect to login
- **Calculator calculations**: Verify units (kg, L) consistent across scenarios
- **Responsive**: Test 768px mobile breakpoint, user header stays sticky
- **Duplicate Prevention**: Verify cannot register same phone twice

## Future Enhancement Points
- Email verification alternative to SMS OTP
- Password-based login in addition to OTP
- User profile/history dashboard
- Export recommendations as PDF
- Integration with actual SMS provider (remove console logging)

