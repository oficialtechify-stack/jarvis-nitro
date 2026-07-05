export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

// Auxiliar para obter a próxima hora (padrão de duração de 1h para eventos criados)
function getNextHour(timeStr: string): string {
  try {
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || "00";
    hours = (hours + 1) % 24;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  } catch (e) {
    return "11:00";
  }
}

/**
 * Busca os próximos eventos da agenda primária do Google Agenda
 */
export async function fetchGoogleEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  try {
    // Busca eventos a partir do início de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=20`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    throw error;
  }
}

/**
 * Cria um novo evento no Google Agenda
 */
export async function createGoogleEvent(
  accessToken: string, 
  event: { title: string; description?: string; date: string; time: string }
): Promise<GoogleCalendarEvent> {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    
    // Alinha os horários start e end
    const startDateTime = `${event.date}T${event.time}:00`;
    const endDateTime = `${event.date}T${getNextHour(event.time)}:00`;

    const body = {
      summary: event.title,
      description: event.description || "Agendado via J.A.R.V.I.S. Neural System",
      start: {
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Calendar POST error: ${response.status} - ${errBody}`);
    }

    const createdEvent = await response.json();
    return createdEvent;
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    throw error;
  }
}

/**
 * Exclui um evento do Google Agenda
 */
export async function deleteGoogleEvent(accessToken: string, eventId: string): Promise<void> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Calendar DELETE error: ${response.status} - ${errBody}`);
    }
  } catch (error) {
    console.error("Failed to delete Google Calendar event:", error);
    throw error;
  }
}
