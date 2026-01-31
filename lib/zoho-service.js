
  // Waitlist management
  async addToWaitlist(waitlistData) {
    await this.refreshTokenIfNeeded();

    const data = {
      data: [
        {
          City_Waitlist: waitlistData.city,
          Telegram_User_ID: String(waitlistData.telegram_user_id),
          Telegram_Username: waitlistData.username,
          First_Name: waitlistData.first_name,
          Notification_Sent: waitlistData.notification_sent,
          Created_At: waitlistData.created_at,
        }
      ]
    };

    try {
      const response = await axios.post(
        'https://www.zohoapis.com/crm/v2/City_Waitlist',
        data,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('Waitlist entry created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Add to waitlist error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getWaitlistForCity(city) {
    await this.refreshTokenIfNeeded();

    try {
      const response = await axios.get(
        `https://www.zohoapis.com/crm/v2/City_Waitlist/search?criteria=(City_Waitlist:equals:${city})`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          }
        }
      );

      return response.data?.data || [];
    } catch (error) {
      console.error('Get waitlist error:', error.response?.data || error.message);
      return [];
    }
  }

  async markWaitlistNotified(recordId) {
    await this.refreshTokenIfNeeded();

    const data = {
      data: [
        {
          id: recordId,
          Notification_Sent: true,
        }
      ]
    };

    try {
      const response = await axios.put(
        'https://www.zohoapis.com/crm/v2/City_Waitlist',
        data,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('Waitlist marked as notified:', response.data);
      return response.data;
    } catch (error) {
      console.error('Mark notified error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new ZohoService();
