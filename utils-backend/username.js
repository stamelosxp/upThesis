const User = require("../models/User"); // adjust path

function transliterateGreekToEnglish(text) {
  const map = {
    Α: "A",
    Β: "V",
    Γ: "G",
    Δ: "D",
    Ε: "E",
    Ζ: "Z",
    Η: "I",
    Θ: "Th",
    Ι: "I",
    Κ: "K",
    Λ: "L",
    Μ: "M",
    Ν: "N",
    Ξ: "X",
    Ο: "O",
    Π: "P",
    Ρ: "R",
    Σ: "S",
    Τ: "T",
    Υ: "Y",
    Φ: "F",
    Χ: "Ch",
    Ψ: "Ps",
    Ω: "O",
    Ά: "A",
    Έ: "E",
    Ή: "I",
    Ί: "I",
    Ό: "O",
    Ύ: "Y",
    Ώ: "O",
    Ϊ: "I",
    Ϋ: "Y",

    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
    ά: "a",
    έ: "e",
    ή: "i",
    ί: "i",
    ό: "o",
    ύ: "y",
    ώ: "o",
    ϊ: "i",
    ϋ: "y",
    ΐ: "i",
    ΰ: "y",
  };
  return text
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

async function generateUniqueUsername(firstName, lastName) {
  console.log("Generating username for:", firstName, lastName);

  const firstInitial = transliterateGreekToEnglish(
    firstName.trim()[0] || ""
  ).toLowerCase();
  const lastTranslit = transliterateGreekToEnglish(
    lastName.trim()
  ).toLowerCase();
  let baseUsername = (firstInitial + lastTranslit).substring(0, 10); // initial username

  let username = baseUsername;
  let suffix = 1;

  // Check in DB if username exists
  while (await User.exists({ username })) {
    console.log(`Username ${username} already exists. Trying a new one.`);
    // Add a numeric suffix, truncate base to fit 10 chars
    const trimmedBase = baseUsername.substring(0, 10 - String(suffix).length);
    username = trimmedBase + suffix;
    suffix++;
    console.log("Trying username:", username);
  }

  return username;
}

module.exports = { transliterateGreekToEnglish, generateUniqueUsername };
