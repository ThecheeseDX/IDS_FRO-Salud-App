/**
 * Valida si un correo electrónico tiene una estructura sintáctica correcta.
 * @param {string} email 
 * @returns {boolean} - true si es válido, false si no.
 */
export const validateEmail = (email) => {
  // Expresión regular estándar para comprobar correos (ejemplo@dominio.com)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida un RUT chileno calculando su Dígito Verificador (Módulo 11).
 * Soporta formatos con o sin puntos, y con guión (ej: "12.345.678-K" o "12345678K").
 * @param {string} fullRut 
 * @returns {boolean} - true si el RUT es real y válido, false si es falso o inválido.
 */
export const validateRut = (fullRut) => {
  if (!fullRut || typeof fullRut !== 'string') return false;

  // 1. Limpiar el texto: quitar puntos, guiones y espacios, y pasarlo a mayúsculas
  const cleanRut = fullRut.replace(/[^0-9kK]/g, '').toUpperCase();

  // Un RUT válido necesita mínimo 8 caracteres (ej: 7777777K)
  if (cleanRut.length < 8) return false;

  // 2. Separar el cuerpo numérico del dígito verificador (DV)
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // 3. Algoritmo del Módulo 11
  let sum = 0;
  let multiplier = 2;

  // Multiplicar los dígitos de atrás hacia adelante por 2,3,4,5,6,7,2,3...
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  // Calcular el dígito esperado
  const expectedResult = 11 - (sum % 11);
  
  let expectedDv;
  if (expectedResult === 11) expectedDv = '0';
  else if (expectedResult === 10) expectedDv = 'K';
  else expectedDv = expectedResult.toString();

  // 4. Comparar el dígito ingresado con el esperado por la matemática chilena
  return dv === expectedDv;
};

/**
 * Valida que un número de teléfono móvil chileno tenga una estructura base limpia (9 dígitos).
 * @param {string} phone 
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // En Chile los celulares tienen 9 dígitos (ej: 912345678)
  return cleanPhone.length === 9;
};