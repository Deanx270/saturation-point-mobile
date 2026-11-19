import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import apiClient from '../../api/client';
import AtelierText from '../../components/common/AtelierText';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierQuantityStepper from '../../components/common/AtelierQuantityStepper';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierAvatar from '../../components/common/AtelierAvatar';
import AtelierToast from '../../components/common/AtelierToast';
import {
  fetchProductDetails,
  syncProductSnapshot,
} from '../../redux/productsSlice';
import { addToCart, selectCartItems } from '../../redux/cartSlice';
import {
  checkEligibility,
  submitReview,
  editReview,
  resetReviewStatus,
  removeReview,
} from '../../redux/reviewsSlice';
import {
  formatPrice,
  formatDate,
  isValidRemoteOrLocalUri,
  resolveProductPricing,
  optimizeImageUrl,
} from '../../utils/formatters';
import { submitFormWithScroll } from '../../utils/formScroll';

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
  const {
    productId,
    discountPercent = 0,
    promoTitle = '',
    focusReview = false,
  } = route.params || {};
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scrollViewRef = useRef(null);
  const galleryRef = useRef(null);
  const contentOffsetY = useRef(0);
  const reviewsOffsetY = useRef(null);
  const didAutoScrollRef = useRef(false);
  const {
    selectedProduct,
    detailLoading,
    detailError,
    detailErrorTargetId,
  } = useSelector((state) => state.products);
  const { isEligible, submitting, submitSuccess, error: reviewError } = useSelector(
    (state) => state.reviews
  );
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const cartItems = useSelector(selectCartItems);

  const [quantity, setQuantity] = useState(1);
  const [stockWarning, setStockWarning] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editingReview, setEditingReview] = useState(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null);
  const [addedToCartSheetVisible, setAddedToCartSheetVisible] = useState(false);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    iconName: 'checkmark-circle',
    key: 0,
  });

  useEffect(() => {
    didAutoScrollRef.current = false;
    contentOffsetY.current = 0;
    reviewsOffsetY.current = null;
    setSelectedImageIndex(0);
    galleryRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    setQuantity(1);
    setStockWarning('');
    setEditingReview(null);
    setDeleteReviewTarget(null);
    dispatch(fetchProductDetails(productId));
    if (user && user.role !== 'admin') {
      dispatch(checkEligibility(productId));
    }
  }, [dispatch, productId, user]);

  useFocusEffect(
    useCallback(() => {
      if (productId) {
        dispatch(fetchProductDetails(productId));
      }
      if (user && user.role !== 'admin' && productId) {
        dispatch(checkEligibility(productId));
      }
    }, [dispatch, productId, user])
  );

  useEffect(() => {
    if (submitSuccess) {
      setEditingReview(null);
      dispatch(resetReviewStatus());
      setToastState({
        visible: true,
        message: 'Review saved',
        iconName: 'checkmark-circle',
        key: Date.now(),
      });
    }
  }, [submitSuccess, dispatch]);

  const [lastAddedQty, setLastAddedQty] = useState(1);

  const isStaleProduct = !selectedProduct || (productId && selectedProduct._id !== productId);
  const pricing = !isStaleProduct
    ? resolveProductPricing(selectedProduct, discountPercent, promoTitle)
    : resolveProductPricing(null, discountPercent, promoTitle);
  const parsedDiscount = pricing.discountPercent;
  const hasPromoDiscount = pricing.hasPromo;
  const effectivePromoTitle = pricing.promoTitle;
  const promoExpiresAt = pricing.expiresAt;
  const existingCartItem = !isStaleProduct
    ? cartItems.find((item) => item.product === selectedProduct._id)
    : null;
  const existingCartQty = existingCartItem ? existingCartItem.quantity : 0;
  const remainingStock = !isStaleProduct
    ? Math.max(0, (selectedProduct.stock || 0) - existingCartQty)
    : 0;
  const effectiveUnitPrice = !isStaleProduct ? pricing.effectivePrice : 0;

  useEffect(() => {
    if (
      focusReview &&
      !isStaleProduct &&
      reviewsOffsetY.current !== null &&
      !didAutoScrollRef.current
    ) {
      didAutoScrollRef.current = true;
      const targetY = Math.max(
        0,
        contentOffsetY.current + reviewsOffsetY.current - 16
      );
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: targetY,
          animated: true,
        });
      }, 150);
    }
  }, [focusReview, isStaleProduct, isEligible]);

  useEffect(() => {
    if (!isStaleProduct && remainingStock >= 1 && quantity > remainingStock) {
      setQuantity(remainingStock);
    }
  }, [isStaleProduct, remainingStock, quantity]);

  const handleQuantityChange = (nextQty) => {
    setStockWarning('');
    setQuantity(nextQty);
  };

  const handleAddToCart = async () => {
    Keyboard.dismiss();
    if (isStaleProduct || addingToCart || selectedProduct.stock <= 0) {
      return;
    }

    setAddingToCart(true);
    try {
      let latestProduct = selectedProduct;
      try {
        const res = await apiClient.get(`/products/${selectedProduct._id}`);
        if (res.data?._id) {
          latestProduct = res.data;
          dispatch(syncProductSnapshot(latestProduct));
        }
      } catch (e) {}

      const liveStock = Math.max(0, Number(latestProduct.stock) || 0);
      const liveRemaining = Math.max(0, liveStock - existingCartQty);

      if (liveStock <= 0) {
        setStockWarning('This item is now out of stock.');
        Alert.alert('Out of Stock', `${latestProduct.name} is currently out of stock.`);
        return;
      }

      if (liveRemaining <= 0) {
        Alert.alert(
          'Stock Limit Reached',
          `You already have the maximum available stock (${liveStock}) for ${latestProduct.name} in your cart.`
        );
        return;
      }

      if (quantity > liveRemaining) {
        setQuantity(liveRemaining);
        setStockWarning(`Maximum available to add is ${liveRemaining}.`);
        Alert.alert(
          'Stock Updated',
          `Only ${liveRemaining} more ${liveRemaining === 1 ? 'unit is' : 'units are'} available (${liveStock} total in stock).`
        );
        return;
      }

      const qtyToAdd = Math.max(1, Math.min(quantity, liveRemaining));
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      const latestPricing = resolveProductPricing(
        latestProduct,
        parsedDiscount,
        effectivePromoTitle
      );

      dispatch(
        addToCart({
          product: latestProduct._id,
          name: latestProduct.name,
          price: latestPricing.effectivePrice,
          originalPrice: latestPricing.basePrice,
          discountPercent: latestPricing.discountPercent,
          quantity: qtyToAdd,
          image: latestProduct.images?.[0] || '',
          brand: latestProduct.brand,
          stock: liveStock,
        })
      );
      setLastAddedQty(qtyToAdd);
      setAddedToCartSheetVisible(true);
    } finally {
      setAddingToCart(false);
    }
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
    const res = await dispatch(removeReview({ productId, reviewId: targetId }));
    if (removeReview.fulfilled.match(res)) {
      setToastState({
        visible: true,
        message: 'Review deleted',
        iconName: 'trash-outline',
        key: Date.now(),
      });
    }
  };

  const sortedReviews = useMemo(() => {
    const list = Array.isArray(selectedProduct?.reviews)
      ? [...selectedProduct.reviews]
      : [];
    const currentUserId = user?._id ? String(user._id) : null;
    return list.sort((a, b) => {
      const aOwn = Boolean(currentUserId && a?.user && String(a.user) === currentUserId);
      const bOwn = Boolean(currentUserId && b?.user && String(b.user) === currentUserId);
      if (aOwn !== bOwn) {
        return aOwn ? -1 : 1;
      }
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [selectedProduct?.reviews, user?._id]);

  if (!productId) {
    return (
      <View style={styles.loadingContainer}>
        <AtelierHeader
          title="Product Details"
          leftType="back"
          navigation={navigation}
        />
        <AtelierErrorBanner message="Unable to load this product." />
      </View>
    );
  }

  const hasCurrentDetailError = Boolean(detailError && detailErrorTargetId === productId);

  if (hasCurrentDetailError && isStaleProduct) {
    return (
      <View style={styles.loadingContainer}>
        <AtelierHeader
          title="Product Details"
          leftType="back"
          navigation={navigation}
        />
        <AtelierErrorBanner
          message={detailError}
          onRetry={() => dispatch(fetchProductDetails(productId))}
        />
      </View>
    );
  }

  if (detailLoading || isStaleProduct) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.imageGallery}>
          <AtelierSkeleton
            width="100%"
            height="100%"
            borderRadius={0}
          />
        </View>
        <View style={styles.skeletonThumbnailRow}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              width={60}
              height={60}
              borderRadius={theme.radii.xs}
            />
          ))}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.brandCategoryRow}>
            <AtelierSkeleton
              height={13}
              width={86}
            />
            <AtelierSkeleton
              height={20}
              width={76}
              borderRadius={theme.radii.badge}
            />
          </View>
          <AtelierSkeleton
            height={26}
            width="84%"
            style={{ marginTop: 6, marginBottom: 8 }}
          />
          <AtelierSkeleton
            height={26}
            width="54%"
            style={{ marginBottom: 16 }}
          />
          <View style={styles.ratingPriceRow}>
            <AtelierSkeleton
              height={22}
              width={96}
            />
            <AtelierSkeleton
              height={18}
              width={110}
            />
          </View>
          <AtelierSkeleton
            height={15}
            width="100%"
            style={{ marginBottom: 8 }}
          />
          <AtelierSkeleton
            height={15}
            width="90%"
            style={{ marginBottom: 8 }}
          />
          <AtelierSkeleton
            height={15}
            width="62%"
            style={{ marginBottom: 24 }}
          />
          <AtelierSkeleton
            height={48}
            width="100%"
            borderRadius={theme.radii.sm}
          />
        </View>
      </View>
    );
  }

  const images = (selectedProduct.images || []).filter(isValidRemoteOrLocalUri);
  const safeImageIndex = images.length > 0 ? Math.min(selectedImageIndex, images.length - 1) : 0;
  const existingUserReview = user
    ? selectedProduct.reviews?.find((r) => String(r.user) === String(user._id))
    : null;
  const showReviewForm = (isEligible && !existingUserReview) || Boolean(editingReview);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageGallery}>
          {images.length > 0 ? (
            <FlatList
              ref={galleryRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, idx) => `gallery-${idx}`}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                galleryRef.current?.scrollToOffset?.({
                  offset: info.index * windowWidth,
                  animated: true,
                });
              }}
              onMomentumScrollEnd={(event) => {
                const nextIdx = Math.round(
                  event.nativeEvent.contentOffset.x / Math.max(1, windowWidth)
                );
                if (!Number.isNaN(nextIdx)) {
                  setSelectedImageIndex(
                    Math.max(0, Math.min(images.length - 1, nextIdx))
                  );
                }
              }}
              renderItem={({ item: uri }) => (
                <View style={[styles.gallerySlide, { width: windowWidth }]}>
                  <Image
                    source={{
                      uri: optimizeImageUrl(uri, {
                        width: 420,
                        crop: 'limit',
                      }),
                    }}
                    style={styles.mainImage}
                    resizeMode="contain"
                  />
                </View>
              )}
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
          {images.length > 1 ? (
            <View
              pointerEvents="none"
              style={styles.galleryCounterPill}
            >
              <AtelierText
                variant="caption"
                color="#FFFFFF"
                style={styles.galleryCounterText}
              >
                {`${safeImageIndex + 1} / ${images.length}`}
              </AtelierText>
            </View>
          ) : null}
          <AtelierPressable
            tone="subtle"
            style={[
              styles.backButton,
              { top: Math.max(insets.top, theme.spacing.lg) + theme.spacing.xs },
            ]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ProductList');
              }
            }}
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.inkPrimary}
            />
          </AtelierPressable>
        </View>

        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
          >
            {images.map((img, idx) => (
              <AtelierPressable
                key={idx}
                tone="subtle"
                haptic="selection"
                onPress={() => {
                  setSelectedImageIndex(idx);
                  galleryRef.current?.scrollToIndex?.({
                    index: idx,
                    animated: true,
                  });
                }}
                style={[
                  styles.thumbnail,
                  safeImageIndex === idx && styles.activeThumbnail,
                ]}
              >
                <Image
                  source={{
                    uri: optimizeImageUrl(img, {
                      width: 60,
                      crop: 'limit',
                    }),
                  }}
                  style={styles.thumbnailImage}
                  resizeMode="contain"
                />
              </AtelierPressable>
            ))}
          </ScrollView>
        )}

        <View
          style={styles.contentContainer}
          onLayout={(event) => {
            contentOffsetY.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.brandCategoryRow}>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
            >
              {selectedProduct.brand}
            </AtelierText>
            <AtelierBadge
              label={
                selectedProduct.stock <= 0
                  ? 'Out of Stock'
                  : selectedProduct.stock <= 5
                  ? `Only ${selectedProduct.stock} left`
                  : `${selectedProduct.stock} in Stock`
              }
              status={
                selectedProduct.stock <= 0
                  ? 'cancelled'
                  : selectedProduct.stock <= 5
                  ? 'warning'
                  : 'success'
              }
            />
          </View>

          <AtelierText
            variant="display"
            style={styles.productName}
          >
            {selectedProduct.name}
          </AtelierText>

          {hasPromoDiscount && (
            <View style={styles.promoBanner}>
              <Ionicons
                name="pricetag-outline"
                size={15}
                color={theme.colors.goldText}
              />
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
                style={styles.promoBannerText}
              >
                {`${effectivePromoTitle ? `${effectivePromoTitle} — ` : ''}${parsedDiscount}% Off${
                  promoExpiresAt ? ` • Ends ${formatDate(promoExpiresAt)}` : ''
                }`}
              </AtelierText>
            </View>
          )}

          <View style={styles.ratingPriceRow}>
            <View style={styles.priceGroup}>
              <AtelierText
                variant="bodyLarge"
                color={theme.colors.inkPrimary}
                style={styles.heroPrice}
              >
                {formatPrice(effectiveUnitPrice)}
              </AtelierText>
              {hasPromoDiscount && (
                <AtelierText
                  variant="bodyMedium"
                  color={theme.colors.inkMuted}
                  style={styles.originalPrice}
                >
                  {formatPrice(selectedProduct.price)}
                </AtelierText>
              )}
            </View>
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

          {!isAdmin ? (
            <>
              <View style={styles.divider} />

              <View style={styles.quantitySection}>
                <View style={styles.quantityLabelCol}>
                  <AtelierText
                    variant="title2"
                    color={theme.colors.inkPrimary}
                    style={styles.quantityTitle}
                  >
                    Quantity
                  </AtelierText>
                  {existingCartQty > 0 && (
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                    >
                      {existingCartQty} already in cart
                    </AtelierText>
                  )}
                  {stockWarning ? (
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.error}
                      style={styles.stockWarningText}
                    >
                      {stockWarning}
                    </AtelierText>
                  ) : null}
                </View>
                <AtelierQuantityStepper
                  value={quantity}
                  min={1}
                  max={remainingStock}
                  disabled={selectedProduct.stock <= 0 || remainingStock <= 0}
                  onChange={handleQuantityChange}
                  onLimitReached={(maxAllowed) =>
                    setStockWarning(`Maximum available to add is ${maxAllowed}.`)
                  }
                  decrementLabel="Decrease quantity"
                  incrementLabel="Increase quantity"
                  inputLabel="Product quantity"
                />
              </View>
            </>
          ) : null}

          <View style={styles.divider} />

          <View
            style={styles.reviewsSection}
            onLayout={(event) => {
              const nextY = event.nativeEvent.layout.y;
              reviewsOffsetY.current = nextY;
              if (
                focusReview &&
                !isStaleProduct &&
                !didAutoScrollRef.current
              ) {
                didAutoScrollRef.current = true;
                const targetY = Math.max(0, contentOffsetY.current + nextY - 16);
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({
                    y: targetY,
                    animated: true,
                  });
                }, 150);
              }
            }}
          >
            <AtelierText
              variant="title2"
              style={styles.sectionHeading}
            >
              Reviews ({selectedProduct.reviews?.length || 0})
            </AtelierText>

            {!isAdmin && showReviewForm ? (
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
                    validateForm,
                    setTouched,
                    values,
                    errors,
                    touched,
                  }) => (
                    <View>
                      <View style={styles.starPickerRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <AtelierPressable
                            key={star}
                            tone="subtle"
                            borderlessRipple
                            haptic="selection"
                            style={styles.starButton}
                            onPress={() => setFieldValue('rating', star)}
                            accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Ionicons
                              name={star <= values.rating ? 'star' : 'star-outline'}
                              size={26}
                              color={theme.colors.gold}
                            />
                          </AtelierPressable>
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
                          onPress={() =>
                            submitFormWithScroll({
                              validateForm,
                              setTouched,
                              handleSubmit,
                              scrollViewRef,
                              yPositions: {
                                comment:
                                  contentOffsetY.current +
                                  (reviewsOffsetY.current || 0),
                              },
                              fieldOrder: ['rating', 'comment'],
                            })
                          }
                          loading={submitting}
                          variant="primary"
                          style={styles.submitReviewButton}
                        />
                      </View>
                    </View>
                  )}
                </Formik>
              </AtelierCard>
            ) : !isAdmin && !existingUserReview ? (
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

            {sortedReviews.length > 0 ? (
              sortedReviews.map((rev) => {
                const isOwnReview = Boolean(
                  user?._id && rev.user && String(user._id) === String(rev.user)
                );
                const canDelete = user?.role === 'admin' || isOwnReview;

                return (
                  <AtelierCard
                    key={rev._id}
                    style={styles.reviewItemCard}
                  >
                    <View style={styles.reviewHeaderRow}>
                      <AtelierAvatar
                        uri={rev.photoURL}
                        name={rev.name}
                        size={36}
                        style={styles.reviewerAvatar}
                      />
                      <View style={styles.reviewerMetaCol}>
                        <AtelierText
                          variant="bodyMedium"
                          color={theme.colors.inkPrimary}
                          numberOfLines={1}
                          style={styles.reviewerName}
                        >
                          {rev.name}
                        </AtelierText>
                        <View style={styles.reviewerSubRow}>
                          {isOwnReview ? (
                            <AtelierText
                              variant="caption"
                              color={theme.colors.goldText}
                              style={styles.ownReviewTag}
                            >
                              Your review
                            </AtelierText>
                          ) : null}
                          {isOwnReview && rev.createdAt ? (
                            <AtelierText
                              variant="bodySmall"
                              color={theme.colors.inkMuted}
                              style={styles.reviewDateText}
                            >
                              •
                            </AtelierText>
                          ) : null}
                          {rev.createdAt ? (
                            <AtelierText
                              variant="bodySmall"
                              color={theme.colors.inkMuted}
                              style={styles.reviewDateText}
                            >
                              {formatDate(rev.createdAt)}
                            </AtelierText>
                          ) : !isOwnReview ? (
                            <AtelierText
                              variant="bodySmall"
                              color={theme.colors.inkMuted}
                              style={styles.reviewDateText}
                            >
                              Verified buyer
                            </AtelierText>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={styles.reviewRatingRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? 'star' : 'star-outline'}
                          size={13}
                          color={theme.colors.gold}
                        />
                      ))}
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
                          <AtelierPressable
                            tone="subtle"
                            hitSlop={8}
                            style={styles.reviewActionLink}
                            onPress={() => handleStartEditReview(rev)}
                          >
                            <AtelierText
                              variant="caption"
                              color={theme.colors.inkPrimary}
                            >
                              Edit
                            </AtelierText>
                          </AtelierPressable>
                        )}
                        {canDelete && (
                          <AtelierPressable
                            tone="subtle"
                            hitSlop={8}
                            style={styles.reviewActionLink}
                            onPress={() => handleDeleteReview(rev._id)}
                          >
                            <AtelierText
                              variant="caption"
                              color={theme.colors.error}
                            >
                              Delete
                            </AtelierText>
                          </AtelierPressable>
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
        {isAdmin ? (
          <AtelierButton
            title="Edit Product"
            variant="primary"
            onPress={() =>
              navigation.navigate('AdminProductsTab', {
                screen: 'AdminProductForm',
                params: { product: selectedProduct, isEditing: true },
              })
            }
            style={styles.addToCartButton}
          />
        ) : (
          <AtelierButton
            title={
              selectedProduct.stock <= 0
                ? 'Out of Stock'
                : remainingStock <= 0
                  ? 'Max Stock in Cart'
                  : `Add to Cart — ${formatPrice(effectiveUnitPrice * quantity)}`
            }
            onPress={handleAddToCart}
            loading={addingToCart}
            disabled={selectedProduct.stock <= 0 || addingToCart}
            style={styles.addToCartButton}
          />
        )}
      </View>

      <AtelierBottomSheet
        visible={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        title="Delete Review"
        showCloseButton={false}
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
        subtitle={`${lastAddedQty}x ${selectedProduct.name} added to your cart.`}
        options={[
          {
            key: 'cart',
            label: 'View Cart',
            icon: 'bag-outline',
            selected: true,
            onPress: () => {
              setAddedToCartSheetVisible(false);
              navigation.navigate('CartTab', { screen: 'CartScreen' });
            },
          },
          {
            key: 'continue',
            label: 'Continue Shopping',
            icon: 'arrow-forward-outline',
            onPress: () => setAddedToCartSheetVisible(false),
          },
        ]}
      />

      <AtelierToast
        visible={toastState.visible}
        toastKey={toastState.key}
        message={toastState.message}
        iconName={toastState.iconName}
        onDismiss={() => setToastState((prev) => ({ ...prev, visible: false }))}
        style={styles.toastAboveBar}
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
  skeletonThumbnailRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  imageGallery: {
    height: 340,
    width: '100%',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gallerySlide: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCounterPill: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.md,
    backgroundColor: 'rgba(28, 25, 23, 0.68)',
    borderRadius: theme.radii.badge,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  galleryCounterText: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.4,
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
    backgroundColor: theme.colors.surfaceSubtle,
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
    overflow: 'hidden',
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
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: theme.colors.gold,
    borderWidth: 1.5,
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
  heroPrice: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 21,
    lineHeight: 28,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(161, 98, 7, 0.28)',
    marginBottom: theme.spacing.sm,
  },
  promoBannerText: {
    letterSpacing: 0.3,
  },
  ratingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
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
  quantityLabelCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 100,
    paddingRight: theme.spacing.md,
  },
  quantityTitle: {
    marginBottom: 2,
  },
  stockWarningText: {
    marginTop: 2,
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
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  reviewerAvatar: {
    flexShrink: 0,
  },
  reviewerMetaCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  reviewerName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14.5,
    lineHeight: 19,
  },
  reviewerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  ownReviewTag: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  reviewDateText: {
    fontSize: 12,
    lineHeight: 16,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: theme.spacing.xs,
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
  toastAboveBar: {
    bottom: 92,
  },
});

export default ProductDetailsScreen;
