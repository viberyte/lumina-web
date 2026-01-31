'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, CheckCircle2, X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  guestName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, amount, guestName, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Payment Successful!</h3>
        <p className="text-zinc-500 text-sm">Your share has been paid and verified.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-center mb-6">
        <p className="text-zinc-500 text-sm mb-1">Pay your share, {guestName.split(' ')[0]}</p>
        <p className="text-3xl font-semibold text-white">${amount}</p>
      </div>

      <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-white text-black py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount}`
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-zinc-500 hover:text-white py-3 text-sm font-medium transition-colors mt-2"
      >
        Cancel
      </button>

      <div className="mt-4 flex items-start gap-3 p-3 bg-emerald-500/5 rounded-xl">
        <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" />
        <p className="text-zinc-500 text-xs">
          Card payments are <span className="text-emerald-400">instantly verified</span>. Your payment goes directly to the venue.
        </p>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  bookingCode: string;
  guestId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripeCheckout({ bookingCode, guestId, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [amount, setAmount] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const res = await fetch(`/api/book/${bookingCode}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to create checkout');
          setLoading(false);
          return;
        }

        setClientSecret(data.clientSecret);
        setAmount(data.amount);
        setGuestName(data.guestName);
        setLoading(false);
      } catch (err) {
        setError('Failed to initialize checkout');
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [bookingCode, guestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
        <button
          onClick={onCancel}
          className="text-zinc-500 hover:text-white text-sm font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#ffffff',
            colorBackground: '#27272a',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            borderRadius: '12px',
            fontFamily: 'system-ui, sans-serif',
          },
          rules: {
            '.Input': {
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
            },
            '.Input:focus': {
              border: '1px solid #52525b',
              boxShadow: 'none',
            },
            '.Tab': {
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
            },
            '.Tab--selected': {
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
            },
          },
        },
      }}
    >
      <CheckoutForm
        clientSecret={clientSecret}
        amount={amount}
        guestName={guestName}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
