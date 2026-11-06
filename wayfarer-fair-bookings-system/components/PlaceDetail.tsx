'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Place,
  User,
  Review,
  TourSlot,
  bookTourSlot,
  submitReview,
} from '@/services/api';

interface PlaceDetailProps {
  place: Place;
  activeUser: User | null;
  isLoading?: boolean;
  onBookingSuccess?: () => void;
  onReviewSuccess?: () => void;
}

export function PlaceDetail({
  place,
  activeUser,
  isLoading = false,
  onBookingSuccess,
  onReviewSuccess,
}: PlaceDetailProps) {
  // Local state for tours & reviews loaded from the database
  const [tourSlots, setTourSlots] = useState<TourSlot[]>(place.tourSlots || []);
  const [reviews, setReviews] = useState<Review[]>(place.reviews || []);

  // Slot currently undergoing booking API request
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);

  // Review submission in progress state
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Review form state
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');

  // Inline feedback messages
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Detect if active persona already submitted a review for this place
  const existingUserReview = useMemo(() => {
    if (!activeUser) return null;
    return reviews.find((r) => r.userId === activeUser.id);
  }, [reviews, activeUser]);

  // Synchronize when a different place is clicked or loaded
  useEffect(() => {
    setTourSlots(place.tourSlots || []);
    setReviews(place.reviews || []);
    setToastMessage(null);
    setCommentInput('');
    setRatingInput(5);
  }, [place]);

  const ratingValue = Number(place.starRating) || 0;
  const userName = activeUser ? activeUser.name : 'Traveler';

  // Booking action handler connected to POST /api/places/:id/book
  const handleBookSlot = async (slot: TourSlot) => {
    if (!activeUser) {
      setToastMessage({
        type: 'error',
        text: 'Please select a persona from the header dropdown before booking.',
      });
      return;
    }

    if (slot.availableSeats <= 0) {
      setToastMessage({
        type: 'error',
        text: `Unable to book: "${slot.time}" is already fully booked.`,
      });
      return;
    }

    setBookingSlotId(slot.id);
    setToastMessage(null);

    try {
      const res = await bookTourSlot(place.id, slot.id, activeUser.id, 1);

      // Update remaining seats and mark as booked by activeUser locally
      setTourSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id
            ? {
                ...s,
                availableSeats: res.remaining_seats,
                bookedUserIds: [...(s.bookedUserIds || []), activeUser.id],
              }
            : s
        )
      );

      setToastMessage({
        type: 'success',
        text: `Seat confirmed for ${activeUser.name} on the ${slot.time} tour! (${res.remaining_seats} seat${res.remaining_seats === 1 ? '' : 's'} remaining)`,
      });

      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to complete booking';

      setToastMessage({
        type: 'error',
        text: errorMessage,
      });

      // If rejected due to slot being full, update UI to reflect 0 seats
      if (errorMessage.toLowerCase().includes('fully booked')) {
        setTourSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, availableSeats: 0 } : s))
        );
      }
    } finally {
      setBookingSlotId(null);
    }
  };

  // Review submission handler connected to POST /api/places/:id/reviews
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser) {
      setToastMessage({
        type: 'error',
        text: 'Please select a persona from the header before submitting a review.',
      });
      return;
    }

    const trimmedComment = commentInput.trim();
    if (!trimmedComment) {
      setToastMessage({
        type: 'error',
        text: 'Please write a brief comment describing your experience.',
      });
      return;
    }

    if (ratingInput < 1 || ratingInput > 5) {
      setToastMessage({
        type: 'error',
        text: 'Rating must be between 1 and 5 stars.',
      });
      return;
    }

    setIsSubmittingReview(true);
    setToastMessage(null);

    try {
      const res = await submitReview(
        place.id,
        activeUser.id,
        ratingInput,
        trimmedComment
      );
      const isUpdate = Boolean(existingUserReview);

      // Create new/updated review object for local UI state
      const updatedReview: Review = {
        id: res.review.id,
        userId: activeUser.id,
        userName: activeUser.name,
        userAvatar: activeUser.avatar,
        rating: ratingInput,
        comment: trimmedComment,
        date: 'Just now',
      };

      // Upsert into local reviews list
      setReviews((prev) => {
        const remaining = prev.filter((r) => r.userId !== activeUser.id);
        return [updatedReview, ...remaining];
      });

      // Clear input text
      setCommentInput('');

      // Show decent feedback message
      setToastMessage({
        type: 'success',
        text: isUpdate
          ? `Review updated! Your ${ratingInput}-star rating and comment for ${place.name} have been saved.`
          : `Thank you, ${activeUser.name}! Your ${ratingInput}-star review for ${place.name} has been published.`,
      });

      // Trigger parent callback to refresh place ratings and sidebar list
      if (onReviewSuccess) {
        onReviewSuccess();
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to submit review';
      setToastMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 space-y-8 shadow-sm">
      {isLoading && (
        <div className="text-xs text-indigo-600 font-semibold animate-pulse">
          Refreshing details from database...
        </div>
      )}

      {/* 1. Metadata Section */}
      <section className="space-y-4">
        {/* Banner Image */}
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={place.imageUrl}
            alt={place.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-indigo-700 shadow-sm border border-zinc-200">
              {place.category}
            </span>
          </div>
        </div>

        {/* Title, Hours, Star Rating */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {place.name}
            </h1>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-xs font-bold text-amber-800"
                title="Calculated via Bayesian Average ranking (smoothing weight m=5)"
              >
                <span>★</span>
                <span>{ratingValue.toFixed(1)}</span>
                <span className="text-amber-600 font-normal">
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              {place.rawRating !== undefined && place.rawRating !== ratingValue && place.reviewCount > 0 && (
                <span className="text-[11px] text-zinc-400 font-medium">
                  (Bayesian score • raw avg: {place.rawRating.toFixed(1)})
                </span>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Opening Hours: <strong>{place.openingHours}</strong></span>
          </p>

          <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
            {place.description}
          </p>
        </div>
      </section>

      {/* Inline Feedback Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : toastMessage.type === 'info'
              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-700 ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Guided Tours Section */}
      <section className="pt-6 border-t border-zinc-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Guided Tours</h2>
            <p className="text-xs text-zinc-500">
              Available slots fetched from database. Acting as: <strong className="text-zinc-700">{userName}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {tourSlots.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No scheduled tour slots available for this place.</p>
          ) : (
            tourSlots.map((slot) => {
              const isFull = slot.availableSeats <= 0;
              const isUserBooked = Boolean(
                activeUser && slot.bookedUserIds?.includes(activeUser.id)
              );

              return (
                <div
                  key={slot.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors gap-3 ${
                    isUserBooked
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : isFull
                      ? 'bg-zinc-50 border-zinc-200 opacity-60'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-900">{slot.time}</div>
                      {isUserBooked && (
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Your Reservation
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">Guide: {slot.guide}</div>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-xs font-medium ${
                          isUserBooked
                            ? 'text-emerald-700 font-semibold'
                            : isFull
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isUserBooked
                          ? 'You are booked on this tour'
                          : isFull
                          ? '0 seats left'
                          : `${slot.availableSeats} of ${slot.totalSeats} seats left`}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isUserBooked ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-emerald-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Booked</span>
                      </button>
                    ) : isFull ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200 text-zinc-400 cursor-not-allowed"
                      >
                        Fully booked
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={bookingSlotId !== null}
                        onClick={() => handleBookSlot(slot)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                          bookingSlotId === slot.id
                            ? 'bg-indigo-400 cursor-wait'
                            : bookingSlotId !== null
                            ? 'bg-indigo-300 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                        }`}
                      >
                        {bookingSlotId === slot.id ? (
                          <>
                            <svg
                              className="animate-spin h-3.5 w-3.5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Booking...</span>
                          </>
                        ) : (
                          'Book Tour'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Existing Reviews Section */}
      <section className="pt-6 border-t border-zinc-100 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">
          Visitor Reviews ({reviews.length})
        </h2>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No reviews yet for this place.</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {rev.userAvatar}
                    </span>
                    <span className="text-xs font-bold text-zinc-800">{rev.userName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <span>★ {rev.rating}</span>
                    <span className="text-zinc-400 font-normal ml-2">{rev.date}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Interactive Review Submission Form */}
      <section className="pt-6 border-t border-zinc-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Leave a Review</h2>
          <span className="text-xs text-zinc-500">
            Reviewing as: <strong className="text-indigo-600">{userName}</strong>
          </span>
        </div>

        {existingUserReview && (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>✍️</span>
              <span>
                You already reviewed this place (<strong>★ {existingUserReview.rating}</strong>). Submitting will update your rating and comment.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRatingInput(existingUserReview.rating);
                setCommentInput(existingUserReview.comment);
              }}
              className="text-[11px] font-semibold text-indigo-700 underline hover:text-indigo-900 ml-2 whitespace-nowrap"
            >
              Load previous
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitReview} className="space-y-3.5">
          {/* Star selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Your Rating:
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = (hoverRating !== null ? hoverRating : ratingInput) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRatingInput(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-125 text-amber-400"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      className={`w-5 h-5 ${isLit ? 'fill-current' : 'text-zinc-200'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-zinc-700">
                {ratingInput} of 5 stars
              </span>
            </div>
          </div>

          {/* Short text input */}
          <div>
            <textarea
              rows={3}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={`Share your highlights with fellow travelers, ${userName}...`}
              className="w-full rounded-xl border border-zinc-200 p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingReview}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 ${
                isSubmittingReview
                  ? 'bg-indigo-400 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isSubmittingReview ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : existingUserReview ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
