import { lightFormat } from 'date-fns'

export const getCurrentDateTime = () => lightFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
