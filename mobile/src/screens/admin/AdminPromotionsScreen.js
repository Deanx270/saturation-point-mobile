import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierHeader from '../../components/common/AtelierHeader';
import apiClient from '../../api/client';
import { fetchProducts } from '../../redux/productsSlice';

const PromoSchema = Yup.object().shape({
  title: Yup.string().required('Notification title is required'),
  body: Yup.string().required('Notification message is required'),
  discountPercent: Yup.number()
    .typeError('Enter a valid percentage')
    .min(1, 'Minimum 1%')
    .max(99, 'Maximum 99%'),
});

export const AdminPromotionsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminItems, items } = useSelector((state) => state.products);
  const productOptions = adminItems.length > 0 ? adminItems : items;
  const [selectedProductId, setSelectedProductId] = useState(
    productOptions.length > 0 ? productOptions[0]._id : ''
  );
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (productOptions.length === 0) {
      dispatch(fetchProducts({ target: 'admin', page: 1, limit: 20 }));
    }
  }, [dispatch, productOptions.length]);

  useEffect(() => {
    if (!selectedProductId && productOptions.length > 0) {
      setSelectedProductId(productOptions[0]._id);
    }
  }, [productOptions, selectedProductId]);

  const handleBroadcast = async (values, { resetForm }) => {
    setBroadcasting(true);
    try {
      const response = await apiClient.post('/promotions/broadcast', {
        title: values.title,
        body: values.body,
        discountPercent: Number(values.discountPercent) || 15,
        productId: selectedProductId,
      });

      Alert.alert(
        'Notification Sent',
        response.data?.message || 'Promotional notification sent to registered users.'
      );
      resetForm();
    } catch (error) {
      Alert.alert(
        'Send Failed',
        error.response?.data?.message || 'Unable to send notification.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Send Promotions"
        leftType={navigation.canGoBack() ? 'back' : 'drawer'}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AtelierCard
          subtle
          style={styles.infoCard}
        >
          <AtelierText
            variant="caption"
            color={theme.colors.goldText}
            style={styles.infoLabel}
          >
            PROMOTIONAL NOTIFICATIONS
          </AtelierText>
          <AtelierText
            variant="bodyMedium"
            color={theme.colors.inkSecondary}
            style={styles.infoText}
          >
            Send push notifications to signed-in customers. Tapping the notification opens the selected product.
          </AtelierText>
        </AtelierCard>

        <Formik
          initialValues={{
            title: '',
            body: '',
            discountPercent: '15',
          }}
          validationSchema={PromoSchema}
          onSubmit={handleBroadcast}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.formContainer}>
              <AtelierInput
                label="Title"
                placeholder="e.g. Weekend Ink Sale"
                value={values.title}
                onChangeText={handleChange('title')}
                onBlur={handleBlur('title')}
                error={errors.title}
                touched={touched.title}
              />

              <AtelierInput
                label="Message"
                placeholder="Write a short promotional message for customers..."
                value={values.body}
                onChangeText={handleChange('body')}
                onBlur={handleBlur('body')}
                multiline
                numberOfLines={3}
                error={errors.body}
                touched={touched.body}
              />

              <AtelierInput
                label="Discount (%)"
                placeholder="15"
                value={values.discountPercent}
                onChangeText={handleChange('discountPercent')}
                onBlur={handleBlur('discountPercent')}
                keyboardType="numeric"
                error={errors.discountPercent}
                touched={touched.discountPercent}
              />

              <AtelierText
                variant="caption"
                color={theme.colors.inkSecondary}
                style={styles.pickerLabel}
              >
                FEATURED PRODUCT
              </AtelierText>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productPickerScroll}
              >
                {productOptions.slice(0, 12).map((prod) => {
                  const isSelected = selectedProductId === prod._id;
                  return (
                    <AtelierPressable
                      key={prod._id}
                      tone={isSelected ? 'solid' : 'surface'}
                      haptic="selection"
                      hitSlop={4}
                      onPress={() => setSelectedProductId(prod._id)}
                      style={[
                        styles.productChip,
                        isSelected && styles.productChipSelected,
                      ]}
                    >
                      <AtelierText
                        variant="caption"
                        color={isSelected ? '#FFFFFF' : theme.colors.inkPrimary}
                        numberOfLines={1}
                      >
                        {prod.name}
                      </AtelierText>
                    </AtelierPressable>
                  );
                })}
              </ScrollView>

              <AtelierButton
                title={broadcasting ? 'Sending...' : 'Send Notification'}
                onPress={handleSubmit}
                loading={broadcasting}
                variant="gold"
                style={styles.submitButton}
              />
            </View>
          )}
        </Formik>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  infoCard: {
    marginBottom: theme.spacing.xl,
  },
  infoLabel: {
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    lineHeight: 20,
  },
  formContainer: {
    marginTop: theme.spacing.xs,
  },
  pickerLabel: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  productPickerScroll: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  productChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.hero,
  },
});

export default AdminPromotionsScreen;
