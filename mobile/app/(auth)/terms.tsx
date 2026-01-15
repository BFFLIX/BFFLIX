// mobile/app/(auth)/terms.tsx

import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { authStyles, colors } from "../../src/styles/authStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          authStyles.scrollContainer,
          { paddingTop: insets.top + 20 },
        ]}
      >
        {/* Header with back button */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 8 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[authStyles.title, { textAlign: "left", marginBottom: 0 }]}>
            Terms of Service
          </Text>
        </View>

        <Text style={[authStyles.subtitle, { textAlign: "left", marginBottom: 24 }]}>
          Last updated: January 4, 2025
        </Text>

        <View style={{ gap: 20 }}>
          <View>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By accessing and using BFFlix, you accept and agree to be bound by the terms and
              provision of this agreement. If you do not agree to abide by these terms, please do
              not use this service.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.paragraph}>
              BFFlix is a social media platform for sharing and discovering movie and TV show
              reviews with your friends and circles. We provide features for creating posts,
              joining circles, viewing content, and interacting with other users.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.paragraph}>
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
              You must be at least 13 years old to use this service.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>4. User Content</Text>
            <Text style={styles.paragraph}>
              You retain all rights to the content you post on BFFlix. By posting content, you grant
              BFFlix a non-exclusive, worldwide, royalty-free license to use, display, and distribute
              your content on the platform. You are solely responsible for the content you post and
              must ensure it does not violate any laws or third-party rights.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>5. Prohibited Conduct</Text>
            <Text style={styles.paragraph}>
              You agree not to:
              {"\n"}• Post harmful, offensive, or illegal content
              {"\n"}• Harass, bully, or threaten other users
              {"\n"}• Impersonate others or misrepresent your identity
              {"\n"}• Spam or use the service for commercial purposes without permission
              {"\n"}• Attempt to gain unauthorized access to the service or user accounts
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>6. Content Moderation</Text>
            <Text style={styles.paragraph}>
              BFFlix reserves the right to remove any content that violates these terms or is deemed
              inappropriate. We may suspend or terminate accounts that repeatedly violate our policies.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>7. Privacy</Text>
            <Text style={styles.paragraph}>
              Your use of BFFlix is also governed by our Privacy Policy. Please review our Privacy
              Policy to understand how we collect, use, and protect your information.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
            <Text style={styles.paragraph}>
              The BFFlix platform, including its design, logos, and original content, is protected by
              copyright and other intellectual property laws. You may not copy, modify, or distribute
              our platform without permission.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
            <Text style={styles.paragraph}>
              BFFlix is provided "as is" without warranties of any kind, either express or implied.
              We do not guarantee that the service will be uninterrupted, error-free, or secure.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              BFFlix shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages resulting from your use of or inability to use the service.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify these terms at any time. We will notify users of
              significant changes. Your continued use of the service after changes constitutes
              acceptance of the new terms.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>12. Contact Information</Text>
            <Text style={styles.paragraph}>
              If you have questions about these Terms of Service, please contact us through the
              app or visit our support page.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = {
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
};
