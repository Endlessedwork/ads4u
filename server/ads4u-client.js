import fetch from 'node-fetch';

const API_URL = 'https://ads4u.co/api/v2';

async function callApi(action, params = {}) {
  const apiKey = process.env.ADS4U_API_KEY;
  if (!apiKey) {
    throw new Error('ADS4U_API_KEY is not configured');
  }

  const body = new URLSearchParams({
    key: apiKey,
    action,
    ...params,
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();

  if (data.error) {
    const err = new Error(data.error);
    err.code = 'ADS4U_API_ERROR';
    throw err;
  }

  return data;
}

export async function getServices() {
  return callApi('services');
}

export async function addOrder({ serviceId, link, quantity }) {
  return callApi('add', {
    service: String(serviceId),
    link,
    quantity: String(quantity),
  });
}

export async function getOrderStatus(orderId) {
  return callApi('status', { order: String(orderId) });
}

export async function refillOrder(orderId) {
  return callApi('refill', { order: String(orderId) });
}

export async function getRefillStatus(refillId) {
  return callApi('refill_status', { refill: String(refillId) });
}

export async function cancelOrder(orderId) {
  return callApi('cancel', { order: String(orderId) });
}

export async function getBalance() {
  return callApi('balance');
}
