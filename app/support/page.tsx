export default function SupportPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#09090b', 
      color: 'white', 
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>Lumina Support</h1>
        
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '32px' }}>
          Need help? We're here for you. Reach out and we'll get back to you as soon as possible.
        </p>
        
        <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Email Support</h2>
          <a href="mailto:support@viberyte.com" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: '18px' }}>
            support@viberyte.com
          </a>
        </div>
        
        <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Response Time</h2>
          <p style={{ color: '#a1a1aa', margin: 0 }}>We typically respond within 24-48 hours.</p>
        </div>
        
        <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>FAQs</h2>
          <p style={{ color: '#a1a1aa', marginBottom: '12px' }}><strong>How do I plan a night?</strong><br/>Open the Chat tab and tell Lumina what you're looking for.</p>
          <p style={{ color: '#a1a1aa', marginBottom: '12px' }}><strong>How does Budget for Me work?</strong><br/>On any venue page, tap "Budget for me" and enter your budget. Our AI will recommend the perfect meal.</p>
          <p style={{ color: '#a1a1aa', margin: 0 }}><strong>What cities are supported?</strong><br/>Currently NYC metro area including Manhattan, Brooklyn, Queens, and New Jersey.</p>
        </div>
        
        <p style={{ color: '#52525b', marginTop: '40px', textAlign: 'center' }}>
          © 2024 Viberyte Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
