import EmptyState from '../common/EmptyState';
import ReviewItem from './ReviewItem';

const ReviewList = ({
  reviews = [],
  currentUser = null,
  isAuthenticated = false,
  updatingReviewId = null,
  replyingReviewId = null,
  onUpdateReview,
  onDeleteReview,
  onAddReply,
}) => {
  if (!reviews.length) {
    return (
      <EmptyState
        title="Sin resenas todavia"
        description="Sea el primero en compartir una opinion sobre esta obra."
      />
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {reviews.map((review) => {
        const reviewId = review._id || review.id;
        return (
          <ReviewItem
            key={reviewId}
            review={review}
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            isUpdating={String(updatingReviewId) === String(reviewId)}
            isReplying={String(replyingReviewId) === String(reviewId)}
            onUpdateReview={onUpdateReview}
            onDeleteReview={onDeleteReview}
            onAddReply={onAddReply}
          />
        );
      })}
    </div>
  );
};

export default ReviewList;

