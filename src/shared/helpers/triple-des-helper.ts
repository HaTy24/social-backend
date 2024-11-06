import tripleDES from 'node_triple_des';

export const encrypt = (dataToEncrypt: string, key: string): string => tripleDES.encrypt(dataToEncrypt, key)

export const decrypt = (encryptedData: string, key: string): string => tripleDES.decrypt(encryptedData, key)