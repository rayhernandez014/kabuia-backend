const bcrypt = require('bcrypt')
const config = require('./config')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const validatePassword = (password) => {

  /*
  The regular expression below cheks that a password:

    Has minimum 12 characters in length. Adjust it by modifying {12,}
    At least one uppercase English letter. You can remove this condition by removing (?=.*?[A-Z])
    At least one lowercase English letter.  You can remove this condition by removing (?=.*?[a-z])
    At least one digit. You can remove this condition by removing (?=.*?[0-9])
    At least one special character,  You can remove this condition by removing (?=.*?[#?!@$%^&*-])
  */

  const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{12,}$/

  return passwordRegex.test(password)
}

const hashPassword = async (password) => {

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  return passwordHash
}

const comparePasswords = async (password, hash) => {

  const result = await bcrypt.compare(password, hash)

  return result

}

module.exports = {
  validatePassword,
  hashPassword,
  comparePasswords,
}