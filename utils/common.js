const isFutureDate = (dateString) => {
    const inputDate = new Date(dateString)
    if (isNaN(inputDate.getTime())) return false // Invalid date
    const now = new Date()
    return inputDate > now
}

module.exports = {
  isFutureDate
}