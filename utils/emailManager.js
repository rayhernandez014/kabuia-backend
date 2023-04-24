const nodemailer = require('nodemailer')

const sendEmail = async (from, to, subject, text) => {
  const testAccount = await nodemailer.createTestAccount()

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  })

  const mailOptions = {
    from: from, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: text, // plain text body
  }

  const result = await transporter.sendMail(mailOptions)

  console.log('Message sent: %s', result.messageId)
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result))

}

module.exports = {
  sendEmail
}