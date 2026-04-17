const API_BASE = '/api';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// User API
export const userAPI = {
  login: async (username: string) => {
    const data = await fetchAPI('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    return data.user;
  },

  getProfile: async (userId: string) => {
    const data = await fetchAPI(`/users/${userId}/profile`);
    return data.profile;
  },

  updateProfile: async (userId: string, profile: any) => {
    return fetchAPI(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  getSettings: async (userId: string) => {
    const data = await fetchAPI(`/users/${userId}/settings`);
    return data.settings;
  },

  updateSettings: async (userId: string, settings: any) => {
    return fetchAPI(`/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  exportData: async (userId: string) => {
    return fetchAPI(`/users/${userId}/export`);
  },

  importData: async (userId: string, data: any) => {
    return fetchAPI(`/users/${userId}/import`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Exercises API
export const exercisesAPI = {
  getCustom: async (userId: string) => {
    const data = await fetchAPI(`/exercises/${userId}`);
    return data.exercises;
  },

  create: async (userId: string, exercise: any) => {
    const data = await fetchAPI(`/exercises/${userId}`, {
      method: 'POST',
      body: JSON.stringify(exercise),
    });
    return data.exercise;
  },

  update: async (userId: string, exerciseId: string, exercise: any) => {
    const data = await fetchAPI(`/exercises/${userId}/${exerciseId}`, {
      method: 'PUT',
      body: JSON.stringify(exercise),
    });
    return data.exercise;
  },

  delete: async (userId: string, exerciseId: string) => {
    return fetchAPI(`/exercises/${userId}/${exerciseId}`, {
      method: 'DELETE',
    });
  },
};

// Workouts API
export const workoutsAPI = {
  getAll: async (userId: string) => {
    const data = await fetchAPI(`/workouts/${userId}`);
    return data.workouts;
  },

  create: async (userId: string, workout: any) => {
    const data = await fetchAPI(`/workouts/${userId}`, {
      method: 'POST',
      body: JSON.stringify(workout),
    });
    return data.workout;
  },

  update: async (userId: string, workoutId: string, workout: any) => {
    return fetchAPI(`/workouts/${userId}/${workoutId}`, {
      method: 'PUT',
      body: JSON.stringify(workout),
    });
  },

  delete: async (userId: string, workoutId: string) => {
    return fetchAPI(`/workouts/${userId}/${workoutId}`, {
      method: 'DELETE',
    });
  },

  getLastExerciseData: async (userId: string, exerciseId: string) => {
    const data = await fetchAPI(`/workouts/${userId}/exercise/${exerciseId}/last`);
    return data.lastData;
  },
};

// Cardio API
export const cardioAPI = {
  getAll: async (userId: string) => {
    const data = await fetchAPI(`/cardio/${userId}`);
    return data.sessions;
  },

  create: async (userId: string, session: any) => {
    const data = await fetchAPI(`/cardio/${userId}`, {
      method: 'POST',
      body: JSON.stringify(session),
    });
    return data.session;
  },

  update: async (userId: string, sessionId: string, session: any) => {
    return fetchAPI(`/cardio/${userId}/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(session),
    });
  },

  delete: async (userId: string, sessionId: string) => {
    return fetchAPI(`/cardio/${userId}/${sessionId}`, {
      method: 'DELETE',
    });
  },
};

// Templates API
export const templatesAPI = {
  getAll: async (userId: string) => {
    const data = await fetchAPI(`/templates/${userId}`);
    return data.templates;
  },

  create: async (userId: string, template: any) => {
    const data = await fetchAPI(`/templates/${userId}`, {
      method: 'POST',
      body: JSON.stringify(template),
    });
    return data.template;
  },

  update: async (userId: string, templateId: string, template: any) => {
    return fetchAPI(`/templates/${userId}/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  },

  delete: async (userId: string, templateId: string) => {
    return fetchAPI(`/templates/${userId}/${templateId}`, {
      method: 'DELETE',
    });
  },

  getWeeklyPlan: async (userId: string) => {
    const data = await fetchAPI(`/templates/${userId}/weekly-plan`);
    return data.plan;
  },

  updateWeeklyPlan: async (userId: string, plan: any[]) => {
    return fetchAPI(`/templates/${userId}/weekly-plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
  },
};
