import { lightFormat, subDays, startOfDay, startOfISOWeek, startOfMonth, startOfYear, parse } from 'date-fns'

const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss.SSS'
const formatDateTime = (d) => lightFormat(d, DATETIME_FORMAT)

export const getCurrentDateTime = () => formatDateTime(new Date())
export const getStartOfToday = () => formatDateTime(startOfDay(new Date()))
export const getStartOfYesterday = () => formatDateTime(startOfDay(subDays(new Date(), 1)))
export const getStartOfThisWeek = () => formatDateTime(startOfISOWeek(new Date()))
export const getStartOfThisMonth = () => formatDateTime(startOfMonth(new Date()))
export const getStartOfThisYear = () => formatDateTime(startOfYear(new Date()))
export const parseDateTime = (dateStr) => parse(dateStr, DATETIME_FORMAT, new Date())
export const isSame = (dateA, dateB) => parseDateTime(dateA).isSame(parseDateTime(dateB))
