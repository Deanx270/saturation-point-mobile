import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import { fetchProductDetails } from '../../redux/productsSlice';
import { addToCart } from '../../redux/cartSlice';
import {
  checkEligibility,
  submitReview,
  editReview,
  resetReviewStatus,
  removeReview,
} from '../../redux/reviewsSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

const ReviewSchema = Yup.object().shape({
  rating: Yup.number()
    .min(1, 'Select a star rating between 1 and 5')
    .max(5, 'Select a star rating between 1 and 5')
    .required('Rating is required'),
  comment: Yup.string()
    .trim()
    .min(3, 'Review comment must be at least 3 characters')
    .max(500, 'Review comment must be 500 characters or less')
    .required('Please write a review comment'),
});

export const ProductDetailsScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { selectedProduct, loading, error } = useSelector((state) => state.products);
  const { isEligible, submitting, submitSuccess, error: reviewError } = useSelector(
    (state) => state.reviews
  );
  const { user } = useSelector((state) => state.auth);

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editingReview, setEditingReview] = useState(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null);
  const [addedToCartSheetVisible, setAddedToCartSheetVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchProductDetails(productId));
    if (user) {
      dispatch(checkEligibility(productId));
    }
  }, [dispatch, productId, user]);

  useEffect(() => {
    if (submitSuccess) {
      setEditingReview(null);
      dispatch(resetReviewStatus());
      Alert.alert('Review Saved', 'Your review has been saved.');
    }
  }, [submitSuccess, dispatch]);

  const handleAddToCart = async () => {
    if (!selectedProduct) {
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { }

    dispatch(
      addToCart({
        product: selectedProduct._id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity,
        image: selectedProduct.images?.[0] || '',
        brand: selectedProduct.brand,
        stock: selectedProduct.stock,
      })
    );
    setAddedToCartSheetVisible(true);
  };

  const handleReviewSubmit = async (values, { resetForm }) => {
    const cleanComment = values.comment.trim();
    const result = editingReview
      ? await dispatch(
        editReview({
          productId,
          reviewId: editingReview._id,
          rating: values.rating,
          comment: cleanComment,
        })
      )
      : await dispatch(
        submitReview({
          productId,
          rating: values.rating,
          comment: cleanComment,
        })
      );

    if (
      submitReview.fulfilled.match(result) ||
      editReview.fulfilled.match(result)
    ) {
      resetForm();
    } else if (result.payload) {
      Alert.alert('Review Not Saved', result.payload);
    }
  };

  const handleStartEditReview = (review) => {
    dispatch(resetReviewStatus());
    setEditingReview(review);
  };

  const handleCancelEdit = () => {
    dispatch(resetReviewStatus());
    setEditingReview(null);
  };

  const handleDeleteReview = (reviewId) => {
    setDeleteReviewTarget(reviewId);
  };

  const handleConfirmDeleteReview = async () => {
    if (!deleteReviewTarget) {
      return;
    }
    const targetId = deleteReviewTarget;
    setDeleteReviewTarget(null);
    await dispatch(removeReview({ productId, reviewId: targetId }));
  };

  if (error && !selectedProduct) {
    return (
      <View style={styles.loadingContainer}>
        <AtelierHeader
          title="Product Details"
          leftType="back"
          navigation={navigation}
        />
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchProductDetails(productId))}
        />
      </View>
    );
  }

  if (loading || !selectedProduct) {
    return (
      <View style={styles.loadingContainer}>
        <AtelierSkeleton
          height={320}
          borderRadius={0}
        />
        <View style={styles.skeletonPadding}>
          <AtelierSkeleton
            height={28}
            width="70%"
            style={{ marginBottom: 12 }}
          />
          <AtelierSkeleton
            height={20}
            width="40%"
            style={{ marginBottom: 20 }}
          />
          <AtelierSkeleton
            height={80}
            width="100%"
          />
        </View>
      </View>
    );
  }

  const images = (selectedProduct.images || []).filter(isValidRemoteOrLocalUri);
  const existingUserReview = user
    ? selectedProduct.reviews?.find((r) => r.user === user._id)
    : null;
  const showReviewForm = (isEligible && !existingUserReview) || Boolean(editingReview);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageGallery}>
          {images.length > 0 ? (
            <Image
              source={{ uri: images[selectedImageIndex] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={48}
                color={theme.colors.inkMuted}
              />
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.backButton,
              { top: Math.max(insets.top, theme.spacing.lg) + theme.spacing.xs },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.inkPrimary}
            />
          </TouchableOpacity>
        </View>

        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
          >
            {images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImageIndex(idx)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === idx && styles.activeThumbnail,
                ]}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.thumbnailImage}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.brandCategoryRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              {selectedProduct.brand}
            </AtelierText>
            <AtelierBadge
              label={
                selectedProduct.stock > 0
                  ? `${selectedProduct.stock} in Stock`
                  : 'Out of Stock'
              }
              status={selectedProduct.stock > 0 ? 'success' : 'cancelled'}
            />
          </View>

          <AtelierText
            variant="display"
            style={styles.productName}
          >
            {selectedProduct.name}
          </AtelierText>

          <View style={styles.ratingPriceRow}>
            <AtelierText
              variant="title1"
              color={theme.colors.inkPrimary}
            >
              {formatPrice(selectedProduct.price)}
            </AtelierText>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(selectedProduct.rating) ? 'star' : 'star-outline'}
                  size={18}
                  color={theme.colors.gold}
                />
              ))}
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkSecondary}
                style={styles.ratingLabel}
              >
                {selectedProduct.numReviews > 0
                  ? `${selectedProduct.rating.toFixed(1)} (${selectedProduct.numReviews})`
                  : 'No reviews'}
              </AtelierText>
            </View>
          </View>

          <View style={styles.divider} />

          <AtelierText
            variant="title2"
            style={styles.sectionHeading}
          >
            Description
          </AtelierText>
          <AtelierText
            variant="bodyLarge"
            color={theme.colors.inkSecondary}
            style={styles.descriptionText}
          >
            {selectedProduct.description}
          </AtelierText>

          <View style={styles.divider} />

          <View style={styles.quantitySection}>
            <AtelierText
              variant="caption"
              color={theme.colors.inkSecondary}
            >
              Quantity
            </AtelierText>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={theme.colors.inkPrimary}
                />
              </TouchableOpacity>
              <AtelierText
                variant="title2"
                style={styles.stepperValue}
              >
                {quantity}
              </AtelierText>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() =>
                  setQuantity(Math.min(selectedProduct.stock || 10, quantity + 1))
                }
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={theme.colors.inkPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.reviewsSection}>
            <AtelierText
              variant="title2"
              style={styles.sectionHeading}
            >
              Reviews ({selectedProduct.reviews?.length || 0})
            </AtelierText>

            {showReviewForm ? (
              <AtelierCard
                subtle
                style={styles.reviewFormCard}
              >
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  style={styles.formHeader}
                >
                  {editingReview ? 'Edit Review' : 'Write a Review'}
                </AtelierText>
                {reviewError ? (
                  <AtelierErrorBanner
                    message={reviewError}
                    style={styles.reviewErrorBanner}
                  />
                ) : null}
                <Formik
                  enableReinitialize
                  initialValues={{
                    rating: editingReview?.rating || 5,
                    comment: editingReview?.comment || '',
                  }}
                  validationSchema={ReviewSchema}
                  onSubmit={handleReviewSubmit}
                >
                  {({
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    setFieldValue,
                    values,
                    errors,
                    touched,
                  }) => (
                    <View>
                      <View style={styles.starPickerRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            style={styles.starButton}
                            onPress={() => setFieldValue('rating', star)}
                          >
                            <Ionicons
                              name={star <= values.rating ? 'star' : 'star-outline'}
                              size={26}
                              color={theme.colors.gold}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <AtelierInput
                        placeholder="Share your thoughts about this product..."
                        value={values.comment}
                        onChangeText={handleChange('comment')}
                        onBlur={handleBlur('comment')}
                        autoCapitalize="sentences"
                        multiline
                        error={errors.comment}
                        touched={touched.comment}
                      />
                      <View style={styles.reviewFormButtons}>
                        {editingReview ? (
                          <AtelierButton
                            title="Cancel"
                            onPress={handleCancelEdit}
                            variant="outline"
                            style={styles.cancelEditButton}
                          />
                        ) : null}
                        <AtelierButton
                          title={editingReview ? 'Update Review' : 'Submit Review'}
                          onPress={handleSubmit}
                          loading={submitting}
                          variant="primary"
                          style={styles.submitReviewButton}
                        />
                      </View>
                    </View>
                  )}
                </Formik>
              </AtelierCard>
            ) : !existingUserReview ? (
              <AtelierCard
                subtle
                style={styles.ineligibleCard}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={theme.colors.inkMuted}
                />
                <AtelierText
                  variant="bodySmall"
                  color={theme.colors.inkMuted}
                  style={styles.ineligibleText}
                >
                  Only customers with a delivered order for this item can write a review.
                </AtelierText>
              </AtelierCard>
            ) : null}

            {selectedProduct.reviews && selectedProduct.reviews.length > 0 ? (
              selectedProduct.reviews.map((rev) => {
                const isOwnReview = user?._id === rev.user;
                const canDelete = user?.role === 'admin' || isOwnReview;

                return (
                  <AtelierCard
                    key={rev._id}
                    style={styles.reviewItemCard}
                  >
                    <View style={styles.reviewHeaderRow}>
                      <AtelierText
                        variant="title2"
                        style={styles.reviewerName}
                      >
                        {rev.name}
                      </AtelierText>
                      <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= rev.rating ? 'star' : 'star-outline'}
                            size={14}
                            color={theme.colors.gold}
                          />
                        ))}
                      </View>
                    </View>
                    <AtelierText
                      variant="bodyMedium"
                      color={theme.colors.inkSecondary}
                      style={styles.reviewComment}
                    >
                      {rev.comment}
                    </AtelierText>
                    {(isOwnReview || canDelete) && (
                      <View style={styles.reviewActionsRow}>
                        {isOwnReview && (
                          <TouchableOpacity
                            style={styles.reviewActionLink}
                            onPress={() => handleStartEditReview(rev)}
                          >
                            <AtelierText
                              variant="caption"
                              color={theme.colors.inkPrimary}
                            >
                              Edit
                            </AtelierText>
                          </TouchableOpacity>
                        )}
                        {canDelete && (
                          <TouchableOpacity
                            style={styles.reviewActionLink}
                            onPress={() => handleDeleteReview(rev._id)}
                          >
                            <AtelierText
                              variant="caption"
                              color={theme.colors.error}
                            >
                              Delete
                            </AtelierText>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </AtelierCard>
                );
              })
            ) : (
              <AtelierText
                variant="bodyMedium"
                color={theme.colors.inkMuted}
                style={styles.noReviewsText}
              >
                No reviews yet.
              </AtelierText>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <AtelierButton
          title={
            selectedProduct.stock > 0
              ? `Add to Cart — ${formatPrice(selectedProduct.price * quantity)}`
              : 'Out of Stock'
          }
          onPress={handleAddToCart}
          disabled={selectedProduct.stock <= 0}
          style={styles.addToCartButton}
        />
      </View>

      <AtelierBottomSheet
        visible={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        title="Delete Review"
        subtitle="Are you sure you want to delete this review?"
        options={[
          {
            key: 'delete',
            label: 'Delete Review',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleConfirmDeleteReview,
          },
          {
            key: 'cancel',
            label: 'Cancel',
            icon: 'close-outline',
            onPress: () => setDeleteReviewTarget(null),
          },
        ]}
      />

      <AtelierBottomSheet
        visible={addedToCartSheetVisible}
        onClose={() => setAddedToCartSheetVisible(false)}
        title="Added to Cart"
        subtitle={`${quantity}x ${selectedProduct.name} added to your cart.`}
        options={[
          {
            key: 'cart',
            label: 'View Cart',
            icon: 'bag-outline',
            selected: true,
            onPress: () => navigation.navigate('CartTab'),
          },
          {
            key: 'continue',
            label: 'Continue Shopping',
            icon: 'arrow-forward-outline',
            onPress: () => setAddedToCartSheetVisible(false),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  skeletonPadding: {
    padding: theme.spacing.xl,
  },
  imageGallery: {
    height: 340,
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.surfaceSubtle,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.hero + 10,
    left: theme.spacing.lg,
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    borderRadius: theme.radii.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: theme.spacing.xl,
  },
  brandCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  productName: {
    marginBottom: theme.spacing.sm,
  },
  ratingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  sectionHeading: {
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    lineHeight: 24,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surface,
  },
  stepperButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 40,
    textAlign: 'center',
  },
  reviewsSection: {
    marginTop: theme.spacing.sm,
    paddingBottom: 96,
  },
  reviewFormCard: {
    marginBottom: theme.spacing.lg,
  },
  reviewErrorBanner: {
    marginBottom: theme.spacing.md,
  },
  formHeader: {
    marginBottom: theme.spacing.sm,
  },
  starPickerRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  starButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFormButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelEditButton: {
    flex: 1,
  },
  submitReviewButton: {
    flex: 2,
  },
  ineligibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  ineligibleText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  reviewItemCard: {
    marginBottom: theme.spacing.md,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  reviewerName: {
    fontSize: 15,
  },
  reviewComment: {
    lineHeight: 20,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  reviewActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  noReviewsText: {
    marginTop: theme.spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addToCartButton: {
    width: '100%',
  },
});

export default ProductDetailsScreen;
