// Email validation
exports.validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

// Password validation (8-16 chars, uppercase, special char)
exports.validatePassword = (password) => {
  if (password.length < 8 || password.length > 16) {
    return false;
  }
  
  const uppercaseRegex = /[A-Z]/;
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
  
  return uppercaseRegex.test(password) && specialCharRegex.test(password);
};

// Name validation (20-60 chars)
exports.validateName = (name) => {
  return name.length >= 20 && name.length <= 60;
};

// Address validation (max 400 chars)
exports.validateAddress = (address) => {
  return address.length <= 400;
};

// Rating validation (1-5)
exports.validateRating = (rating) => {
  const numRating = Number(rating);
  return Number.isInteger(numRating) && numRating >= 1 && numRating <= 5;
};
