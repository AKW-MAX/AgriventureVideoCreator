import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// ======================================================
// BACKEND
// ======================================================

const API_BASE_URL = 'https://agriventurevideobackend.onrender.com';

// ======================================================
// THEME COLORS
// ======================================================

const THEME_COLORS = [
  { name: 'Farm Green', hex: '#2E7D32' },
  { name: 'Deep Green', hex: '#1B5E20' },
  { name: 'Leaf Green', hex: '#43A047' },
  { name: 'Lime Green', hex: '#7CB342' },
  { name: 'Teal', hex: '#00897B' },
  { name: 'Blue', hex: '#1976D2' },
  { name: 'Sky Blue', hex: '#0288D1' },
  { name: 'Orange', hex: '#F57C00' },
  { name: 'Red', hex: '#D32F2F' },
  { name: 'Purple', hex: '#7B1FA2' },
  { name: 'Brown', hex: '#795548' },
  { name: 'Black', hex: '#212121' },
];

// ======================================================
// TYPES
// ======================================================

type TemplateId =
  | 'modernFarm'
  | 'boldProduct'
  | 'premiumAgri'
  | 'pestControl'
  | 'promotion'
  | 'productInfo'
  | 'socialMedia'
  | 'minimal';

type PosterSizeId =
  | 'square'
  | 'portrait'
  | 'story'
  | 'landscape';

// ======================================================
// TEMPLATE DATA
// ======================================================

const TEMPLATES: {
  id: TemplateId;
  name: string;
  description: string;
}[] = [
  {
    id: 'modernFarm',
    name: 'Modern Farm',
    description: 'Clean agricultural design',
  },
  {
    id: 'boldProduct',
    name: 'Bold Product',
    description: 'Strong product-focused design',
  },
  {
    id: 'premiumAgri',
    name: 'Premium Agri',
    description: 'Professional premium look',
  },
  {
    id: 'pestControl',
    name: 'Pest Control',
    description: 'Ideal for pesticides',
  },
  {
    id: 'promotion',
    name: 'Promotion',
    description: 'Perfect for offers',
  },
  {
    id: 'productInfo',
    name: 'Product Info',
    description: 'Detailed product information',
  },
  {
    id: 'socialMedia',
    name: 'Social Media',
    description: 'Designed for social posts',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant',
  },
];

const POSTER_SIZES: {
  id: PosterSizeId;
  name: string;
  description: string;
}[] = [
  {
    id: 'square',
    name: 'Square',
    description: '1080 × 1080',
  },
  {
    id: 'portrait',
    name: 'Portrait',
    description: '1080 × 1350',
  },
  {
    id: 'story',
    name: 'Story',
    description: '1080 × 1920',
  },
  {
    id: 'landscape',
    name: 'Landscape',
    description: '1920 × 1080',
  },
];

// ======================================================
// SCREEN
// ======================================================

export default function PosterScreen() {
  const router = useRouter();

  // ====================================================
  // BUSINESS INFORMATION
  // ====================================================

  const [logoUri, setLogoUri] =
    useState<string | null>(null);

  const [businessName, setBusinessName] =
    useState('');

  const [themeColor, setThemeColor] =
    useState('#2E7D32');

  const [location, setLocation] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [email, setEmail] =
    useState('');

  // ====================================================
  // PRODUCT INFORMATION
  // ====================================================

  const [productImageUri, setProductImageUri] =
    useState<string | null>(null);

  const [productName, setProductName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [activeIngredient, setActiveIngredient] =
    useState('');

  const [targetPests, setTargetPests] =
    useState('');

  const [crops, setCrops] =
    useState('');

  const [usage, setUsage] =
    useState('');

  const [promoText, setPromoText] =
    useState('');

  // ====================================================
  // DESIGN
  // ====================================================

  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>('modernFarm');

  const [selectedSize, setSelectedSize] =
    useState<PosterSizeId>('square');

  // ====================================================
  // GENERATION
  // ====================================================

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [generatedPosterUrl, setGeneratedPosterUrl] =
    useState<string | null>(null);

  // ====================================================
  // DOWNLOAD
  // ====================================================

  const [isDownloading, setIsDownloading] =
    useState(false);

  // ====================================================
  // NORMALIZED COLOR
  // ====================================================

  const normalizedThemeColor = useMemo(() => {
    const value = themeColor.trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return value;
    }

    return '#2E7D32';
  }, [themeColor]);

  // ====================================================
  // SELECTED COLOR NAME
  // ====================================================

  const selectedColorName = useMemo(() => {
    return (
      THEME_COLORS.find(
        (color) =>
          color.hex.toLowerCase() ===
          normalizedThemeColor.toLowerCase()
      )?.name || 'Custom Green'
    );
  }, [normalizedThemeColor]);

  // ====================================================
  // POSTER ASPECT RATIO
  // ====================================================

  const generatedPosterAspectRatio = useMemo(() => {
    switch (selectedSize) {
      case 'portrait':
        return 1080 / 1350;

      case 'story':
        return 1080 / 1920;

      case 'landscape':
        return 1920 / 1080;

      case 'square':
      default:
        return 1;
    }
  }, [selectedSize]);

  // ====================================================
  // IMAGE PICKER
  // ====================================================

  const pickImage = async (
    type: 'logo' | 'product'
  ) => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo access so you can select an image.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.9,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const selectedUri =
        result.assets[0].uri;

      if (type === 'logo') {
        setLogoUri(selectedUri);
      } else {
        setProductImageUri(selectedUri);
      }

      setGeneratedPosterUrl(null);
    } catch (error) {
      console.error(
        'Image picker error:',
        error
      );

      Alert.alert(
        'Image Error',
        'Unable to select the image. Please try again.'
      );
    }
  };

  // ====================================================
  // REMOVE IMAGES
  // ====================================================

  const removeLogo = () => {
    setLogoUri(null);
    setGeneratedPosterUrl(null);
  };

  const removeProductImage = () => {
    setProductImageUri(null);
    setGeneratedPosterUrl(null);
  };

  // ====================================================
  // URI → DATA URI
  // ====================================================

  const uriToDataUri = async (
    uri: string
  ): Promise<string> => {
    try {
      const base64 =
        await FileSystem.readAsStringAsync(
          uri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );

      const lowerUri =
        uri.toLowerCase();

      let mimeType = 'image/jpeg';

      if (lowerUri.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (
        lowerUri.endsWith('.webp')
      ) {
        mimeType = 'image/webp';
      } else if (
        lowerUri.endsWith('.jpg') ||
        lowerUri.endsWith('.jpeg')
      ) {
        mimeType = 'image/jpeg';
      }

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error(
        'Unable to convert image to data URI:',
        error
      );

      throw new Error(
        'Unable to prepare the selected image. Please choose the image again.'
      );
    }
  };

  // ====================================================
  // NORMALIZE POSTER URL
  // ====================================================

  const normalizePosterUrl = (
    value: string
  ): string => {
    let url = value.trim();

    if (!url) {
      return '';
    }

    if (url.startsWith('/')) {
      url = `${API_BASE_URL}${url}`;
    }

    url = url.replace(
      /^http:\/\/localhost:5001/i,
      API_BASE_URL
    );

    url = url.replace(
      /^http:\/\/127\.0\.0\.1:5001/i,
      API_BASE_URL
    );

    return url;
  };

  // ====================================================
  // GENERATE POSTER
  // ====================================================

  const generatePoster = async () => {
    if (!businessName.trim()) {
      Alert.alert(
        'Business Name Required',
        'Please enter your business/company name.'
      );
      return;
    }

    if (!productName.trim()) {
      Alert.alert(
        'Product Name Required',
        'Please enter the product name.'
      );
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedPosterUrl(null);

      let logoDataUri: string | null = null;
      let productDataUri: string | null = null;

      if (logoUri) {
        logoDataUri =
          await uriToDataUri(logoUri);
      }

      if (productImageUri) {
        productDataUri =
          await uriToDataUri(
            productImageUri
          );
      }

      const payload = {
        businessName:
          businessName.trim(),

        logo: logoDataUri,

        themeColor:
          normalizedThemeColor,

        location:
          location.trim(),

        phone:
          phone.trim(),

        email:
          email.trim(),

        productName:
          productName.trim(),

        productImage:
          productDataUri,

        description:
          description.trim(),

        activeIngredient:
          activeIngredient.trim(),

        targetPests:
          targetPests.trim(),

        crops:
          crops.trim(),

        usage:
          usage.trim(),

        promoText:
          promoText.trim(),

        template:
          selectedTemplate,

        size:
          selectedSize,
      };

      console.log(
        'Generating poster with payload:',
        {
          ...payload,
          logo: logoDataUri
            ? '[IMAGE DATA]'
            : null,
          productImage:
            productDataUri
              ? '[IMAGE DATA]'
              : null,
        }
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/poster/generate`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(payload),
          }
        );

      const responseText =
        await response.text();

      console.log(
        'Poster backend response:',
        responseText
      );

      let data: any;

      try {
        data =
          JSON.parse(responseText);
      } catch {
        throw new Error(
          'The server returned an invalid response.'
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            `Poster generation failed (${response.status}).`
        );
      }

      const rawPosterUrl =
        data.posterUrl ||
        data.url ||
        data.fileUrl;

      if (!rawPosterUrl) {
        throw new Error(
          'The server generated the poster but did not return its URL.'
        );
      }

      const finalPosterUrl =
        normalizePosterUrl(
          rawPosterUrl
        );

      if (!finalPosterUrl) {
        throw new Error(
          'The generated poster URL is empty.'
        );
      }

      console.log(
        'Final poster URL:',
        finalPosterUrl
      );

      setGeneratedPosterUrl(
        finalPosterUrl
      );

      Alert.alert(
        'Poster Ready',
        'Your high-resolution poster has been generated successfully.'
      );
    } catch (error) {
      console.error(
        'Poster generation error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to generate the poster.';

      if (
        message
          .toLowerCase()
          .includes('network') ||
        message
          .toLowerCase()
          .includes('fetch')
      ) {
        Alert.alert(
          'Connection Error',
          `Could not connect to the Agriventure poster server.\n\nMake sure your backend is running at:\n${API_BASE_URL}`
        );
      } else {
        Alert.alert(
          'Generation Failed',
          message
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ====================================================
  // DOWNLOAD POSTER
  // ====================================================

  const downloadPoster = async () => {
    if (!generatedPosterUrl) {
      Alert.alert(
        'No Poster',
        'Please generate a poster first.'
      );
      return;
    }

    try {
      setIsDownloading(true);

      const fileName =
        `agriventure-poster-${Date.now()}.png`;

      const cacheDirectory =
        FileSystem.cacheDirectory;

      if (!cacheDirectory) {
        throw new Error(
          'Temporary storage is not available on this device.'
        );
      }

      const localUri =
        `${cacheDirectory}${fileName}`;

      console.log(
        'Downloading poster:',
        generatedPosterUrl
      );

      const result =
        await FileSystem.downloadAsync(
          generatedPosterUrl,
          localUri
        );

      console.log(
        'Download result:',
        result
      );

      if (result.status !== 200) {
        throw new Error(
          `Could not download the poster. Server returned ${result.status}.`
        );
      }

      console.log(
        'Poster downloaded to:',
        result.uri
      );

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error(
          'Sharing is not available on this device.'
        );
      }

      await Sharing.shareAsync(
        result.uri,
        {
          mimeType: 'image/png',
          dialogTitle:
            'Save or share your Agriventure poster',
          UTI: 'public.png',
        }
      );
    } catch (error) {
      console.error(
        'Poster download error:',
        error
      );

      Alert.alert(
        'Download Failed',
        error instanceof Error
          ? error.message
          : 'Unable to save the poster.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ====================================================
  // TEMPLATE PREVIEW
  // ====================================================

  const renderPosterPreview = () => {
    const business =
      businessName.trim() ||
      'AGRIVENTURE';

    const product =
      productName.trim() ||
      'Your Product';

    const descriptionText =
      description.trim() ||
      'Professional agricultural solution for farmers.';

    const ingredient =
      activeIngredient.trim() ||
      'Active ingredient';

    const pests =
      targetPests.trim() ||
      'Target pests';

    const cropText =
      crops.trim() ||
      'Suitable crops';

    const usageText =
      usage.trim() ||
      'Use according to the product label.';

    const promo =
      promoText.trim() ||
      'SPECIAL OFFER';

    // ==================================================
    // MODERN FARM
    // ==================================================

    if (
      selectedTemplate ===
      'modernFarm'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            {
              backgroundColor:
                '#F4F8F2',
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={[
              styles.previewModernHeader,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          >
            {logoUri ? (
              <Image
                source={{
                  uri: logoUri,
                }}
                style={
                  styles.previewLogo
                }
                resizeMode="contain"
              />
            ) : null}

            <Text
              style={
                styles.previewBusinessName
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.previewMainImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={[
                styles.previewImagePlaceholder,
                {
                  backgroundColor:
                    `${normalizedThemeColor}18`,
                },
              ]}
            >
              <Text
                style={
                  styles.placeholderIcon
                }
              >
                🌱
              </Text>
            </View>
          )}

          <View
            style={
              styles.previewModernBody
            }
          >
            <Text
              style={
                styles.previewProductName
              }
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.previewDescription
              }
              numberOfLines={3}
            >
              {descriptionText}
            </Text>

            <View
              style={[
                styles.previewAccentLine,
                {
                  backgroundColor:
                    normalizedThemeColor,
                },
              ]}
            />

            <Text
              style={
                styles.previewContact
              }
              numberOfLines={2}
            >
              {location ||
              phone ||
              email
                ? `${location} ${phone} ${email}`.trim()
                : 'Contact your agricultural supplier'}
            </Text>
          </View>
        </View>
      );
    }

    // ==================================================
    // BOLD PRODUCT
    // ==================================================

    if (
      selectedTemplate ===
      'boldProduct'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.boldPreview,
            {
              backgroundColor:
                normalizedThemeColor,
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={
              styles.boldTopArea
            }
          >
            {logoUri ? (
              <Image
                source={{
                  uri: logoUri,
                }}
                style={
                  styles.previewLogo
                }
                resizeMode="contain"
              />
            ) : null}

            <Text
              style={
                styles.boldBusinessName
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.boldProductImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.boldPlaceholder
              }
            >
              <Text
                style={
                  styles.boldPlaceholderIcon
                }
              >
                🌾
              </Text>
            </View>
          )}

          <View
            style={
              styles.boldBottomArea
            }
          >
            <Text
              style={
                styles.boldProductName
              }
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.boldDescription
              }
              numberOfLines={3}
            >
              {descriptionText}
            </Text>

            {promoText.trim() ? (
              <Text
                style={
                  styles.boldPromo
                }
                numberOfLines={1}
              >
                {promo}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    // ==================================================
    // PREMIUM AGRI
    // ==================================================

    if (
      selectedTemplate ===
      'premiumAgri'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.premiumPreview,
            {
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={[
              styles.premiumHeader,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          >
            {logoUri ? (
              <Image
                source={{
                  uri: logoUri,
                }}
                style={
                  styles.previewLogo
                }
                resizeMode="contain"
              />
            ) : null}

            <Text
              style={
                styles.premiumBusinessName
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          <View
            style={
              styles.premiumImageArea
            }
          >
            {productImageUri ? (
              <Image
                source={{
                  uri: productImageUri,
                }}
                style={
                  styles.premiumProductImage
                }
                resizeMode="contain"
              />
            ) : (
              <Text
                style={
                  styles.premiumPlaceholder
                }
              >
                🌿
              </Text>
            )}
          </View>

          <View
            style={
              styles.premiumInfo
            }
          >
            <Text
              style={[
                styles.premiumProductName,
                {
                  color:
                    normalizedThemeColor,
                },
              ]}
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.premiumIngredient
              }
              numberOfLines={2}
            >
              {ingredient}
            </Text>

            <Text
              style={
                styles.premiumDescription
              }
              numberOfLines={3}
            >
              {descriptionText}
            </Text>
          </View>
        </View>
      );
    }

    // ==================================================
    // PEST CONTROL
    // ==================================================

    if (
      selectedTemplate ===
      'pestControl'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.pestPreview,
            {
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={[
              styles.pestHeader,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          >
            <Text
              style={
                styles.pestBusiness
              }
              numberOfLines={2}
            >
              {business}
            </Text>

            <Text
              style={
                styles.pestLabel
              }
            >
              PEST CONTROL
            </Text>
          </View>

          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.pestProductImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.pestPlaceholder
              }
            >
              <Text
                style={
                  styles.pestPlaceholderIcon
                }
              >
                🐛
              </Text>
            </View>
          )}

          <View
            style={
              styles.pestContent
            }
          >
            <Text
              style={
                styles.pestProductName
              }
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.pestDetail
              }
              numberOfLines={2}
            >
              Target: {pests}
            </Text>

            <Text
              style={
                styles.pestDetail
              }
              numberOfLines={2}
            >
              Crops: {cropText}
            </Text>

            <Text
              style={
                styles.pestUsage
              }
              numberOfLines={3}
            >
              {usageText}
            </Text>
          </View>
        </View>
      );
    }

    // ==================================================
    // PROMOTION
    // ==================================================

    if (
      selectedTemplate ===
      'promotion'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.promotionPreview,
            {
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={[
              styles.promoHeader,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          >
            {logoUri ? (
              <Image
                source={{
                  uri: logoUri,
                }}
                style={
                  styles.previewLogo
                }
                resizeMode="contain"
              />
            ) : null}

            <Text
              style={
                styles.promoBusiness
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          <View
            style={
              styles.promoBanner
            }
          >
            <Text
              style={
                styles.promoBannerText
              }
              numberOfLines={2}
            >
              {promo}
            </Text>
          </View>

          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.promoProductImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.promoPlaceholder
              }
            >
              <Text
                style={
                  styles.promoPlaceholderIcon
                }
              >
                🌱
              </Text>
            </View>
          )}

          <Text
            style={
              styles.promoProductName
            }
            numberOfLines={2}
          >
            {product}
          </Text>

          <Text
            style={
              styles.promoDescription
            }
            numberOfLines={3}
          >
            {descriptionText}
          </Text>
        </View>
      );
    }

    // ==================================================
    // PRODUCT INFO
    // ==================================================

    if (
      selectedTemplate ===
      'productInfo'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.infoPreview,
            {
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          <View
            style={[
              styles.infoHeader,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          >
            <Text
              style={
                styles.infoAgriTitle
              }
            >
              AGRIVENTURE
            </Text>

            <Text
              style={
                styles.infoBusiness
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.infoProductImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.infoPlaceholder
              }
            >
              <Text
                style={
                  styles.infoPlaceholderIcon
                }
              >
                🌾
              </Text>
            </View>
          )}

          <View
            style={
              styles.infoBody
            }
          >
            <Text
              style={
                styles.infoProductName
              }
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.infoRow
              }
              numberOfLines={2}
            >
              Active: {ingredient}
            </Text>

            <Text
              style={
                styles.infoRow
              }
              numberOfLines={2}
            >
              Target: {pests}
            </Text>

            <Text
              style={
                styles.infoRow
              }
              numberOfLines={2}
            >
              Crops: {cropText}
            </Text>

            <Text
              style={
                styles.infoUsage
              }
              numberOfLines={3}
            >
              {usageText}
            </Text>
          </View>
        </View>
      );
    }

    // ==================================================
    // SOCIAL MEDIA
    // ==================================================

    if (
      selectedTemplate ===
      'socialMedia'
    ) {
      return (
        <View
          style={[
            styles.previewPoster,
            styles.socialPreview,
            {
              aspectRatio:
                generatedPosterAspectRatio,
            },
          ]}
        >
          {productImageUri ? (
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.socialBackgroundImage
              }
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.socialBackgroundFallback,
                {
                  backgroundColor:
                    normalizedThemeColor,
                },
              ]}
            >
              <Text
                style={
                  styles.socialFallbackIcon
                }
              >
                🌱
              </Text>
            </View>
          )}

          <View
            style={
              styles.socialOverlay
            }
          />

          <View
            style={
              styles.socialTop
            }
          >
            {logoUri ? (
              <Image
                source={{
                  uri: logoUri,
                }}
                style={
                  styles.socialLogo
                }
                resizeMode="contain"
              />
            ) : null}

            <Text
              style={
                styles.socialBusiness
              }
              numberOfLines={2}
            >
              {business}
            </Text>
          </View>

          <View
            style={
              styles.socialBottom
            }
          >
            <Text
              style={
                styles.socialProductName
              }
              numberOfLines={2}
            >
              {product}
            </Text>

            <Text
              style={
                styles.socialDescription
              }
              numberOfLines={3}
            >
              {descriptionText}
            </Text>

            {promoText.trim() ? (
              <View
                style={[
                  styles.socialPromoBox,
                  {
                    backgroundColor:
                      normalizedThemeColor,
                  },
                ]}
              >
                <Text
                  style={
                    styles.socialPromoText
                  }
                  numberOfLines={1}
                >
                  {promo}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      );
    }

    // ==================================================
    // MINIMAL
    // ==================================================

    return (
      <View
        style={[
          styles.previewPoster,
          styles.minimalPreview,
          {
            aspectRatio:
              generatedPosterAspectRatio,
          },
        ]}
      >
        <View
          style={
            styles.minimalTop
          }
        >
          {logoUri ? (
            <Image
              source={{
                uri: logoUri,
              }}
              style={
                styles.minimalLogo
              }
              resizeMode="contain"
            />
          ) : null}

          <Text
            style={[
              styles.minimalBusiness,
              {
                color:
                  normalizedThemeColor,
              },
            ]}
            numberOfLines={2}
          >
            {business}
          </Text>
        </View>

        {productImageUri ? (
          <Image
            source={{
              uri: productImageUri,
            }}
            style={
              styles.minimalProductImage
            }
            resizeMode="contain"
          />
        ) : (
          <View
            style={
              styles.minimalPlaceholder
            }
          >
            <Text
              style={
                styles.minimalPlaceholderIcon
              }
            >
              🌿
            </Text>
          </View>
        )}

        <View
          style={
            styles.minimalBottom
          }
        >
          <View
            style={[
              styles.minimalLine,
              {
                backgroundColor:
                  normalizedThemeColor,
              },
            ]}
          />

          <Text
            style={
              styles.minimalProductName
            }
            numberOfLines={2}
          >
            {product}
          </Text>

          <Text
            style={
              styles.minimalDescription
            }
            numberOfLines={3}
          >
            {descriptionText}
          </Text>
        </View>
      </View>
    );
  };

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ============================================== */}
      {/* HEADER */}
      {/* ============================================== */}

      <View style={styles.pageHeader}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text
            style={styles.backButtonText}
          >
            ‹
          </Text>
        </Pressable>

        <View
          style={styles.headerTextArea}
        >
          <Text
            style={styles.pageTitle}
          >
            Poster Creator
          </Text>

          <Text
            style={styles.pageSubtitle}
          >
            Create professional agricultural posters
          </Text>
        </View>
      </View>

      {/* ============================================== */}
      {/* BUSINESS DETAILS */}
      {/* ============================================== */}

      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          1. Business Details
        </Text>

        <Text
          style={styles.sectionSubtitle}
        >
          Add your company information and branding.
        </Text>

        <Text
          style={styles.inputLabel}
        >
          Company Logo
        </Text>

        {logoUri ? (
          <View
            style={
              styles.selectedImageCard
            }
          >
            <Image
              source={{
                uri: logoUri,
              }}
              style={
                styles.selectedLogo
              }
              resizeMode="contain"
            />

            <Pressable
              onPress={removeLogo}
              style={
                styles.removeImageButton
              }
            >
              <Text
                style={
                  styles.removeImageText
                }
              >
                Remove Logo
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              pickImage('logo')
            }
            style={
              styles.uploadCard
            }
          >
            <Text
              style={styles.uploadIcon}
            >
              🖼️
            </Text>

            <Text
              style={styles.uploadTitle}
            >
              Add Company Logo
            </Text>

            <Text
              style={
                styles.uploadSubtitle
              }
            >
              PNG recommended
            </Text>
          </Pressable>
        )}

        <Text
          style={styles.inputLabel}
        >
          Company / Business Name *
        </Text>

        <TextInput
          value={businessName}
          onChangeText={(value) => {
            setBusinessName(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Agriventure Enterprises"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Theme Color
        </Text>

        <Text
          style={styles.helperText}
        >
          Choose a color visually for your poster.
        </Text>

        <View
          style={
            styles.colorPickerCard
          }
        >
          <View
            style={
              styles.selectedColorRow
            }
          >
            <View
              style={[
                styles.selectedColorCircle,
                {
                  backgroundColor:
                    normalizedThemeColor,
                },
              ]}
            />

            <View
              style={
                styles.selectedColorInfo
              }
            >
              <Text
                style={
                  styles.selectedColorName
                }
              >
                {selectedColorName}
              </Text>

              <Text
                style={
                  styles.selectedColorCode
                }
              >
                Selected poster theme
              </Text>
            </View>
          </View>

          <View
            style={styles.colorGrid}
          >
            {THEME_COLORS.map(
              (color) => {
                const colorHex =
                  color.hex;

                const isSelected =
                  normalizedThemeColor.toLowerCase() ===
                  colorHex.toLowerCase();

                return (
                  <Pressable
                    key={colorHex}
                    onPress={() => {
                      setThemeColor(
                        colorHex
                      );

                      setGeneratedPosterUrl(
                        null
                      );
                    }}
                    style={
                      styles.colorOption
                    }
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor:
                            colorHex,
                        },
                        isSelected &&
                          styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected ? (
                        <Text
                          style={
                            styles.colorCheck
                          }
                        >
                          ✓
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.colorName,
                        isSelected &&
                          styles.colorNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {color.name}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
        </View>

        <Text
          style={styles.inputLabel}
        >
          Location
        </Text>

        <TextInput
          value={location}
          onChangeText={(value) => {
            setLocation(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Nairobi, Kenya"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Phone
        </Text>

        <TextInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. +254 700 000 000"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Email
        </Text>

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. info@agriventure.co.ke"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.textInput}
        />
      </View>

      {/* ============================================== */}
      {/* PRODUCT INFORMATION */}
      {/* ============================================== */}

      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          2. Product Information
        </Text>

        <Text
          style={styles.sectionSubtitle}
        >
          Add the product details that should appear on your poster.
        </Text>

        <Text
          style={styles.inputLabel}
        >
          Product Image
        </Text>

        {productImageUri ? (
          <View
            style={
              styles.selectedImageCard
            }
          >
            <Image
              source={{
                uri: productImageUri,
              }}
              style={
                styles.selectedProductImage
              }
              resizeMode="contain"
            />

            <Pressable
              onPress={
                removeProductImage
              }
              style={
                styles.removeImageButton
              }
            >
              <Text
                style={
                  styles.removeImageText
                }
              >
                Remove Product Image
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              pickImage('product')
            }
            style={
              styles.uploadCard
            }
          >
            <Text
              style={styles.uploadIcon}
            >
              📦
            </Text>

            <Text
              style={styles.uploadTitle}
            >
              Add Product Image
            </Text>

            <Text
              style={
                styles.uploadSubtitle
              }
            >
              Clear PNG or JPG recommended
            </Text>
          </Pressable>
        )}

        <Text
          style={styles.inputLabel}
        >
          Product Name *
        </Text>

        <TextInput
          value={productName}
          onChangeText={(value) => {
            setProductName(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Escort 100 SC"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="Short product description..."
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
          style={[
            styles.textInput,
            styles.multilineInput,
          ]}
        />

        <Text
          style={styles.inputLabel}
        >
          Active Ingredient
        </Text>

        <TextInput
          value={activeIngredient}
          onChangeText={(value) => {
            setActiveIngredient(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Active ingredient"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Target Pests
        </Text>

        <TextInput
          value={targetPests}
          onChangeText={(value) => {
            setTargetPests(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Fall armyworm, aphids"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Crops
        </Text>

        <TextInput
          value={crops}
          onChangeText={(value) => {
            setCrops(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. Maize, beans, vegetables"
          placeholderTextColor="#999"
          style={styles.textInput}
        />

        <Text
          style={styles.inputLabel}
        >
          Usage / Application
        </Text>

        <TextInput
          value={usage}
          onChangeText={(value) => {
            setUsage(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="Application or usage instructions..."
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
          style={[
            styles.textInput,
            styles.multilineInput,
          ]}
        />

        <Text
          style={styles.inputLabel}
        >
          Promotion Text
        </Text>

        <TextInput
          value={promoText}
          onChangeText={(value) => {
            setPromoText(value);
            setGeneratedPosterUrl(null);
          }}
          placeholder="e.g. SPECIAL OFFER"
          placeholderTextColor="#999"
          style={styles.textInput}
        />
      </View>

      {/* ============================================== */}
      {/* TEMPLATE */}
      {/* ============================================== */}

      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          3. Choose Template
        </Text>

        <Text
          style={styles.sectionSubtitle}
        >
          Select the style that best fits your product.
        </Text>

        <View
          style={styles.templateGrid}
        >
          {TEMPLATES.map(
            (template) => {
              const selected =
                selectedTemplate ===
                template.id;

              return (
                <Pressable
                  key={template.id}
                  onPress={() => {
                    setSelectedTemplate(
                      template.id
                    );

                    setGeneratedPosterUrl(
                      null
                    );
                  }}
                  style={[
                    styles.templateCard,
                    selected &&
                      styles.templateCardSelected,
                    selected && {
                      borderColor:
                        normalizedThemeColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.templatePreviewIcon,
                      {
                        backgroundColor:
                          selected
                            ? normalizedThemeColor
                            : '#E8F0E7',
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.templatePreviewEmoji
                      }
                    >
                      {template.id ===
                      'pestControl'
                        ? '🐛'
                        : template.id ===
                          'promotion'
                        ? '🏷️'
                        : template.id ===
                          'socialMedia'
                        ? '📱'
                        : template.id ===
                          'premiumAgri'
                        ? '✨'
                        : template.id ===
                          'boldProduct'
                        ? '📦'
                        : template.id ===
                          'productInfo'
                        ? '📋'
                        : template.id ===
                          'minimal'
                        ? '🌿'
                        : '🌾'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.templateName,
                      selected &&
                        styles.templateNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {template.name}
                  </Text>

                  <Text
                    style={
                      styles.templateDescription
                    }
                    numberOfLines={2}
                  >
                    {
                      template.description
                    }
                  </Text>

                  {selected ? (
                    <View
                      style={[
                        styles.templateSelectedBadge,
                        {
                          backgroundColor:
                            normalizedThemeColor,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.templateSelectedText
                        }
                      >
                        ✓ Selected
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>
      </View>

      {/* ============================================== */}
      {/* POSTER SIZE */}
      {/* ============================================== */}

      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          4. Poster Size
        </Text>

        <Text
          style={styles.sectionSubtitle}
        >
          Choose where you plan to use your poster.
        </Text>

        <View
          style={styles.sizeGrid}
        >
          {POSTER_SIZES.map(
            (size) => {
              const selected =
                selectedSize ===
                size.id;

              return (
                <Pressable
                  key={size.id}
                  onPress={() => {
                    setSelectedSize(
                      size.id
                    );

                    setGeneratedPosterUrl(
                      null
                    );
                  }}
                  style={[
                    styles.sizeCard,
                    selected &&
                      styles.sizeCardSelected,
                    selected && {
                      borderColor:
                        normalizedThemeColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeName,
                      selected &&
                        styles.sizeNameSelected,
                    ]}
                  >
                    {size.name}
                  </Text>

                  <Text
                    style={
                      styles.sizeDescription
                    }
                  >
                    {size.description}
                  </Text>

                  {selected ? (
                    <View
                      style={[
                        styles.sizeCheck,
                        {
                          backgroundColor:
                            normalizedThemeColor,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.sizeCheckText
                        }
                      >
                        ✓
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>
      </View>

      {/* ============================================== */}
      {/* PREVIEW */}
      {/* ============================================== */}

      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
        >
          5. Preview
        </Text>

        <Text
          style={styles.sectionSubtitle}
        >
          This preview updates as you change your design.
        </Text>

        <View
          style={styles.previewCard}
        >
          {renderPosterPreview()}
        </View>
      </View>

      {/* ============================================== */}
      {/* GENERATE */}
      {/* ============================================== */}

      <Pressable
        onPress={generatePoster}
        disabled={isGenerating}
        style={[
          styles.generateButton,
          {
            backgroundColor:
              normalizedThemeColor,
            opacity:
              isGenerating
                ? 0.7
                : 1,
          },
        ]}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />

            <View
              style={
                styles.generateTextArea
              }
            >
              <Text
                style={
                  styles.generateButtonText
                }
              >
                Generating Poster...
              </Text>

              <Text
                style={
                  styles.generateButtonSubtext
                }
              >
                Please wait while we create your artwork
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text
              style={
                styles.generateIcon
              }
            >
              ✨
            </Text>

            <View
              style={
                styles.generateTextArea
              }
            >
              <Text
                style={
                  styles.generateButtonText
                }
              >
                Generate Poster
              </Text>

              <Text
                style={
                  styles.generateButtonSubtext
                }
              >
                Create high-resolution artwork
              </Text>
            </View>
          </>
        )}
      </Pressable>
            {/* ============================================== */}
      {/* GENERATED POSTER */}
      {/* ============================================== */}

      {generatedPosterUrl ? (
        <View
          style={
            styles.generatedSection
          }
        >
          <Text
            style={
              styles.generatedTitle
            }
          >
            Your Finished Poster
          </Text>

          <Text
            style={
              styles.generatedSubtitle
            }
          >
            High-resolution artwork generated successfully.
          </Text>

          <View
            style={
              styles.generatedPosterWrapper
            }
          >
            <Image
              source={{
                uri: generatedPosterUrl,
              }}
              style={[
                styles.generatedPosterImage,
                {
                  aspectRatio:
                    generatedPosterAspectRatio,
                },
              ]}
              resizeMode="contain"
            />
          </View>

          <Pressable
            disabled={isDownloading}
            onPress={
              downloadPoster
            }
            style={[
              styles.downloadButton,
              {
                backgroundColor:
                  normalizedThemeColor,
                opacity:
                  isDownloading
                    ? 0.7
                    : 1,
              },
            ]}
          >
            {isDownloading ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <Text
                style={
                  styles.downloadButtonIcon
                }
              >
                ↓
              </Text>
            )}

            <View
              style={
                styles.downloadButtonTextArea
              }
            >
              <Text
                style={
                  styles.downloadButtonText
                }
              >
                {isDownloading
                  ? 'Saving Poster...'
                  : 'Download Poster'}
              </Text>

              <Text
                style={
                  styles.downloadButtonSubtext
                }
              >
                {isDownloading
                  ? 'Please wait...'
                  : 'Save or share the high-resolution PNG'}
              </Text>
            </View>
          </Pressable>

          <Text
            style={
              styles.generatedUrlText
            }
            numberOfLines={2}
          >
            Poster generated successfully.
          </Text>
        </View>
      ) : null}

      <View
        style={styles.bottomSpace}
      />
    </ScrollView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  bottomSpace: {
    height: 30,
  },

  // ====================================================
  // HEADER
  // ====================================================

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backButtonText: {
    fontSize: 34,
    lineHeight: 36,
    color: '#1B5E20',
    fontWeight: '500',
  },

  headerTextArea: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#17351A',
  },

  pageSubtitle: {
    fontSize: 13,
    color: '#6B756C',
    marginTop: 3,
  },

  // ====================================================
  // SECTIONS
  // ====================================================

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#17351A',
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#778078',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },

  // ====================================================
  // INPUTS
  // ====================================================

  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#28332A',
    marginTop: 13,
    marginBottom: 7,
  },

  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DCE3DC',
    backgroundColor: '#FAFCFA',
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: '#1D281F',
  },

  multilineInput: {
    minHeight: 92,
    paddingTop: 12,
    paddingBottom: 12,
  },

  helperText: {
    fontSize: 11,
    color: '#7B857D',
    marginTop: -2,
    marginBottom: 9,
  },

  // ====================================================
  // UPLOAD
  // ====================================================

  uploadCard: {
    minHeight: 125,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BFD0BF',
    backgroundColor: '#F8FBF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },

  uploadIcon: {
    fontSize: 30,
    marginBottom: 7,
  },

  uploadTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#29422B',
  },

  uploadSubtitle: {
    fontSize: 11,
    color: '#7A847B',
    marginTop: 4,
  },

  selectedImageCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCE5DC',
    backgroundColor: '#FAFCFA',
    padding: 12,
    alignItems: 'center',
  },

  selectedLogo: {
    width: '100%',
    height: 105,
  },

  selectedProductImage: {
    width: '100%',
    height: 180,
  },

  removeImageButton: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#FDECEC',
  },

  removeImageText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '800',
  },

  // ====================================================
  // COLOR PICKER
  // ====================================================

  colorPickerCard: {
    borderRadius: 15,
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E0E7E0',
    padding: 13,
  },

  selectedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  selectedColorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  selectedColorInfo: {
    flex: 1,
    marginLeft: 12,
  },

  selectedColorName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#273228',
  },

  selectedColorCode: {
    fontSize: 11,
    color: '#7C867D',
    marginTop: 3,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  colorOption: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
  },

  colorSwatch: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
  },

  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
  },

  colorCheck: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor:
      'rgba(0,0,0,0.25)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },

  colorName: {
    fontSize: 9,
    color: '#667067',
    marginTop: 5,
    textAlign: 'center',
  },

  colorNameSelected: {
    color: '#1F3221',
    fontWeight: '900',
  },

  // ====================================================
  // TEMPLATE GRID
  // ====================================================

  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  templateCard: {
    width: '48.5%',
    borderWidth: 1.5,
    borderColor: '#E0E7E0',
    borderRadius: 15,
    padding: 11,
    marginBottom: 11,
    backgroundColor: '#FBFCFB',
  },

  templateCardSelected: {
    backgroundColor: '#F4FAF3',
    borderWidth: 2,
  },

  templatePreviewIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  templatePreviewEmoji: {
    fontSize: 21,
  },

  templateName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#29342B',
  },

  templateNameSelected: {
    fontWeight: '900',
  },

  templateDescription: {
    fontSize: 10,
    color: '#7B847C',
    lineHeight: 14,
    marginTop: 3,
    minHeight: 28,
  },

  templateSelectedBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  templateSelectedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // ====================================================
  // SIZE
  // ====================================================

  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  sizeCard: {
    width: '48.5%',
    minHeight: 85,
    borderWidth: 1.5,
    borderColor: '#E0E7E0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FBFCFB',
    position: 'relative',
  },

  sizeCardSelected: {
    backgroundColor: '#F4FAF3',
    borderWidth: 2,
  },

  sizeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#29342B',
  },

  sizeNameSelected: {
    fontWeight: '900',
  },

  sizeDescription: {
    fontSize: 11,
    color: '#7A847B',
    marginTop: 5,
  },

  sizeCheck: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sizeCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  // ====================================================
  // PREVIEW
  // ====================================================

  previewCard: {
    borderRadius: 17,
    backgroundColor: '#F1F4F1',
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },

  previewPoster: {
    width: 300,
    maxWidth: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },

  // ====================================================
  // MODERN FARM
  // ====================================================

  previewModernHeader: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  previewLogo: {
    width: 39,
    height: 39,
    marginRight: 9,
  },

  previewBusinessName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 0.15,
  },

  previewMainImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#FFFFFF',
  },

  previewImagePlaceholder: {
    width: '100%',
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderIcon: {
    fontSize: 45,
  },

  previewModernBody: {
    padding: 14,
  },

  previewProductName: {
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '900',
    color: '#203023',
  },

  previewDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: '#5D685F',
    marginTop: 6,
  },

  previewAccentLine: {
    height: 4,
    width: 45,
    borderRadius: 2,
    marginTop: 9,
    marginBottom: 8,
  },

  previewContact: {
    fontSize: 8,
    color: '#6B756C',
  },

  // ====================================================
  // BOLD PRODUCT
  // ====================================================

  boldPreview: {
    backgroundColor: '#FFFFFF',
  },

  boldTopArea: {
    minHeight: 62,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  boldBusinessName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },

  boldProductImage: {
    width: '100%',
    height: 168,
    backgroundColor: '#FFFFFF',
  },

  boldPlaceholder: {
    width: '100%',
    height: 168,
    backgroundColor: '#F4F8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  boldPlaceholderIcon: {
    fontSize: 50,
  },

  boldBottomArea: {
    padding: 15,
  },

  boldProductName: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '900',
    color: '#172019',
  },

  boldDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: '#5F6961',
    marginTop: 7,
  },

  boldPromo: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#F57C00',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // ====================================================
  // PREMIUM
  // ====================================================

  premiumPreview: {
    backgroundColor: '#FFFFFF',
  },

  premiumHeader: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  premiumBusinessName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },

  premiumImageArea: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F6',
  },

  premiumProductImage: {
    width: '90%',
    height: '90%',
  },

  premiumPlaceholder: {
    fontSize: 48,
  },

  premiumInfo: {
    padding: 15,
  },

  premiumProductName: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
  },

  premiumIngredient: {
    fontSize: 10,
    color: '#626B64',
    marginTop: 6,
    fontWeight: '700',
  },

  premiumDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: '#687168',
    marginTop: 7,
  },

  // ====================================================
  // PEST CONTROL
  // ====================================================

  pestPreview: {
    backgroundColor: '#FFFFFF',
  },

  pestHeader: {
    minHeight: 67,
    paddingHorizontal: 13,
    paddingVertical: 10,
    justifyContent: 'center',
  },

  pestBusiness: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },

  pestLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 3,
    letterSpacing: 1,
  },

  pestProductImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F8F4',
  },

  pestPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pestPlaceholderIcon: {
    fontSize: 45,
  },

  pestContent: {
    padding: 14,
  },

  pestProductName: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    color: '#202B22',
  },

  pestDetail: {
    fontSize: 9,
    lineHeight: 13,
    color: '#5E685F',
    marginTop: 5,
  },

  pestUsage: {
    fontSize: 9,
    lineHeight: 13,
    color: '#3F4A41',
    marginTop: 8,
    fontWeight: '700',
  },

  // ====================================================
  // PROMOTION
  // ====================================================

  promotionPreview: {
    backgroundColor: '#FFFFFF',
  },

  promoHeader: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  promoBusiness: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },

  promoBanner: {
    margin: 12,
    borderRadius: 10,
    backgroundColor: '#F57C00',
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  promoBannerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  promoProductImage: {
    width: '100%',
    height: 150,
  },

  promoPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F8F5',
  },

  promoPlaceholderIcon: {
    fontSize: 48,
  },

  promoProductName: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    color: '#1D281F',
    paddingHorizontal: 14,
    marginTop: 10,
  },

  promoDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: '#647067',
    paddingHorizontal: 14,
    marginTop: 6,
  },

  // ====================================================
  // PRODUCT INFO
  // ====================================================

  infoPreview: {
    backgroundColor: '#FFFFFF',
  },

  infoHeader: {
    minHeight: 68,
    paddingHorizontal: 13,
    justifyContent: 'center',
  },

  infoAgriTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  infoBusiness: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
    marginTop: 2,
  },

  infoProductImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#F5F8F4',
  },

  infoPlaceholder: {
    height: 145,
    backgroundColor: '#F5F8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoPlaceholderIcon: {
    fontSize: 45,
  },

  infoBody: {
    padding: 13,
  },

  infoProductName: {
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '900',
    color: '#1D281F',
    marginBottom: 7,
  },

  infoRow: {
    fontSize: 9,
    lineHeight: 13,
    color: '#58635A',
    marginBottom: 4,
  },

  infoUsage: {
    fontSize: 9,
    lineHeight: 13,
    color: '#354037',
    fontWeight: '700',
    marginTop: 6,
  },

  // ====================================================
  // SOCIAL MEDIA
  // ====================================================

  socialPreview: {
    backgroundColor: '#18231A',
  },

  socialBackgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  socialBackgroundFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  socialFallbackIcon: {
    fontSize: 70,
  },

  socialOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor:
      'rgba(0,0,0,0.34)',
  },

  socialTop: {
    position: 'absolute',
    top: 13,
    left: 13,
    right: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  socialLogo: {
    width: 40,
    height: 40,
    marginRight: 9,
  },

  socialBusiness: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
    textShadowColor:
      'rgba(0,0,0,0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  socialBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 15,
  },

  socialProductName: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '900',
    textShadowColor:
      'rgba(0,0,0,0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  socialDescription: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
    textShadowColor:
      'rgba(0,0,0,0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  socialPromoBox: {
    alignSelf: 'flex-start',
    marginTop: 9,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  socialPromoText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // ====================================================
  // MINIMAL
  // ====================================================

  minimalPreview: {
    backgroundColor: '#FFFFFF',
  },

  minimalTop: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  minimalLogo: {
    width: 40,
    height: 40,
    marginRight: 9,
  },

  minimalBusiness: {
    flex: 1,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },

  minimalProductImage: {
    width: '100%',
    height: 165,
    backgroundColor: '#FAFBFA',
  },

  minimalPlaceholder: {
    height: 165,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFA',
  },

  minimalPlaceholderIcon: {
    fontSize: 48,
  },

  minimalBottom: {
    padding: 15,
  },

  minimalLine: {
    height: 4,
    width: 45,
    borderRadius: 2,
    marginBottom: 10,
  },

  minimalProductName: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '900',
    color: '#1E2820',
  },

  minimalDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: '#69736B',
    marginTop: 7,
  },

  // ====================================================
  // GENERATE BUTTON
  // ====================================================

  generateButton: {
    minHeight: 72,
    borderRadius: 16,
    marginTop: 2,
    marginBottom: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  generateIcon: {
    fontSize: 27,
    marginRight: 13,
  },

  generateTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  generateButtonSubtext: {
    color:
      'rgba(255,255,255,0.82)',
    fontSize: 11,
    marginTop: 3,
  },

  // ====================================================
  // GENERATED POSTER
  // ====================================================

  generatedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  generatedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#19321B',
  },

  generatedSubtitle: {
    fontSize: 12,
    color: '#738077',
    marginTop: 4,
    marginBottom: 13,
  },

  generatedPosterWrapper: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F2F4F2',
    alignItems: 'center',
  },

  generatedPosterImage: {
    width: '100%',
    maxHeight: 650,
    backgroundColor: '#F2F4F2',
  },

  // ====================================================
  // DOWNLOAD BUTTON
  // ====================================================

  downloadButton: {
    minHeight: 68,
    borderRadius: 15,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  downloadButtonIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '900',
    marginRight: 12,
  },

  downloadButtonTextArea: {
    flex: 1,
  },

  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  downloadButtonSubtext: {
    color:
      'rgba(255,255,255,0.82)',
    fontSize: 11,
    marginTop: 3,
  },

  generatedUrlText: {
    fontSize: 11,
    color: '#6F796F',
    textAlign: 'center',
    marginTop: 10,
  },
});
