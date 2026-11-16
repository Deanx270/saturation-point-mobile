import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierToast from '../../components/common/AtelierToast';
import { fetchProducts, deleteProduct } from '../../redux/productsSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

const ADMIN_PAGE_LIMIT = 8;

export const AdminProductsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    adminItems,
    adminPage,
    adminTotal,
    adminHasMore,
    adminLoading,
    adminLoadingMore,
    adminError,
  } = useSelector((state) => state.products);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });
  const canGoBack = navigation.canGoBack();

  const loadPage = useCallback(
    (targetPage = 1) => {
      return dispatch(
        fetchProducts({
          target: 'admin',
          page: targetPage,
          limit: ADMIN_PAGE_LIMIT,
        })
      );
    },
    [dispatch]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage(1);
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!adminHasMore || adminLoading || adminLoadingMore) {
      return;
    }
    loadPage(adminPage + 1);
  }, [adminHasMore, adminLoading, adminLoadingMore, loadPage, adminPage]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const { _id, name } = deleteTarget;
    setDeleteTarget(null);
    const result = await dispatch(deleteProduct(_id));
    if (deleteProduct.fulfilled.match(result)) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      setToastState((prev) => ({
        visible: true,
        message: `"${name}" deleted from catalog`,
        key: prev.key + 1,
      }));
    } else {
      Alert.alert(
        'Delete Failed',
        result.payload || 'Unable to delete this product.'
      );
    }
  };

  const renderProductItem = ({ item }) => {
    const firstImage = item.images?.[0];
    const hasValidImage = isValidRemoteOrLocalUri(firstImage);

    return (
      <AtelierCard
        style={styles.card}
        onPress={() =>
          navigation.navigate('AdminProductForm', {
            product: item,
            isEditing: true,
          })
        }
      >
        <View style={styles.cardRow}>
          {hasValidImage ? (
            <Image
              source={{ uri: firstImage }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumb]}>
              <Ionicons
                name="image-outline"
                size={24}
                color={theme.colors.inkMuted}
              />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
                numberOfLines={1}
                style={styles.brandText}
              >
                {item.brand}
              </AtelierText>
              <AtelierBadge
                label={`${item.stock} IN STOCK`}
                status={item.stock > 0 ? 'success' : 'cancelled'}
              />
            </View>

            <AtelierText
              variant="title2"
              numberOfLines={1}
              style={styles.name}
            >
              {item.name}
            </AtelierText>

            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
              style={styles.price}
            >
              {formatPrice(item.price)}
            </AtelierText>

            <View style={styles.actionsRow}>
              <AtelierPressable
                tone="subtle"
                stopPropagation
                hitSlop={10}
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate('AdminProductForm', {
                    product: item,
                    isEditing: true,
                  })
                }
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={theme.colors.inkPrimary}
                />
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkPrimary}
                  style={styles.actionLabel}
                >
                  EDIT
                </AtelierText>
              </AtelierPressable>

              <AtelierPressable
                tone="subtle"
                stopPropagation
                hitSlop={10}
                style={styles.deleteButton}
                onPress={() => setDeleteTarget(item)}
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={theme.colors.error}
                />
                <AtelierText
                  variant="caption"
                  color={theme.colors.error}
                  style={styles.actionLabel}
                >
                  DELETE
                </AtelierText>
              </AtelierPressable>
            </View>
          </View>
        </View>
      </AtelierCard>
    );
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Manage Products"
        leftType={canGoBack ? 'back' : 'drawer'}
        navigation={navigation}
        rightIcon="add-outline"
        rightIconColor={theme.colors.gold}
        rightIconSize={28}
        rightAccessibilityLabel="Add Product"
        onRightPress={() =>
          navigation.navigate('AdminProductForm', { isEditing: false })
        }
      />

      {adminError ? (
        <AtelierErrorBanner
          message={adminError}
          onRetry={() => loadPage(1)}
          style={styles.errorBanner}
        />
      ) : null}

      {adminLoading && adminItems.length === 0 ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              height={110}
              borderRadius={theme.radii.md}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={adminItems}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListFooterComponent={
            adminItems.length > 0 ? (
              <View style={styles.listFooter}>
                {adminLoadingMore ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.gold}
                    />
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                    >
                      Loading more products...
                    </AtelierText>
                  </>
                ) : (
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkMuted}
                  >
                    {adminHasMore
                      ? `Showing ${adminItems.length} of ${adminTotal} products`
                      : `All ${adminTotal || adminItems.length} products shown`}
                  </AtelierText>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !adminError ? (
              <AtelierEmptyState
                iconName="cube-outline"
                title="No Products Found"
                description="Add a product to get started."
                actionTitle="Add Product"
                onActionPress={() =>
                  navigation.navigate('AdminProductForm', { isEditing: false })
                }
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        showCloseButton={false}
        subtitle={
          deleteTarget
            ? `Delete "${deleteTarget.name}" from the catalog?`
            : ''
        }
        options={[
          {
            key: 'confirm',
            label: 'Delete Product',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleConfirmDelete,
          },
          {
            key: 'cancel',
            label: 'Cancel',
            icon: 'close-outline',
            onPress: () => setDeleteTarget(null),
          },
        ]}
      />

      <AtelierToast
        visible={toastState.visible}
        toastKey={toastState.key}
        message={toastState.message}
        onDismiss={() => setToastState((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  skeletonPadding: {
    padding: theme.spacing.lg,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  card: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minHeight: 96,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandText: {
    flexShrink: 1,
  },
  listFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  },
  price: {
    lineHeight: 22,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  actionLabel: {
    marginLeft: 4,
    letterSpacing: 0.8,
  },
});

export default AdminProductsScreen;
