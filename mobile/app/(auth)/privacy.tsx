// mobile/app/(auth)/privacy.tsx

import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { authStyles, colors } from "../../src/styles/authStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function PrivacyPolicyScreen() {
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
            Privacy Policy
          </Text>
        </View>

        <Text style={[authStyles.subtitle, { textAlign: "left", marginBottom: 24 }]}>
          Last updated: January 4, 2025
        </Text>

        <View style={{ gap: 20 }}>
          <View>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to BFFlix. We respect your privacy and are committed to protecting your
              personal data. This privacy policy will inform you about how we collect, use, and
              protect your information when you use our service.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect the following types of information:
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>Account Information:</Text> Name, email address,
              username, and password when you create an account.
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>Profile Information:</Text> Profile picture,
              bio, and other optional information you choose to provide.
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>Content:</Text> Posts, reviews, comments, and
              other content you create on the platform.
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>Usage Data:</Text> Information about how you use
              the app, including features accessed and interactions with other users.
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>Device Information:</Text> Device type, operating
              system, and unique device identifiers.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use your information to:
              {"\n"}• Provide and maintain the BFFlix service
              {"\n"}• Create and manage your account
              {"\n"}• Enable you to connect with friends and join circles
              {"\n"}• Personalize your experience and show relevant content
              {"\n"}• Send you notifications and updates (with your consent)
              {"\n"}• Improve our service and develop new features
              {"\n"}• Ensure security and prevent fraud
              {"\n"}• Comply with legal obligations
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>4. Information Sharing</Text>
            <Text style={styles.paragraph}>
              We do not sell your personal information. We may share your information:
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>With Other Users:</Text> Your profile, posts,
              and reviews are visible to other users based on your privacy settings.
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>With Service Providers:</Text> We may share data
              with third-party service providers who help us operate the platform (hosting, analytics).
              {"\n\n"}
              <Text style={{ fontWeight: "600" }}>For Legal Reasons:</Text> We may disclose
              information if required by law or to protect our rights and safety.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement appropriate security measures to protect your data, including encryption
              of passwords and secure data transmission. However, no method of transmission over the
              internet is 100% secure, and we cannot guarantee absolute security.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>6. Your Privacy Rights</Text>
            <Text style={styles.paragraph}>
              You have the right to:
              {"\n"}• Access and update your personal information
              {"\n"}• Delete your account and associated data
              {"\n"}• Control your privacy settings and who can see your content
              {"\n"}• Opt out of promotional communications
              {"\n"}• Request a copy of your data
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>7. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your information for as long as your account is active or as needed to
              provide services. If you delete your account, we will delete or anonymize your data
              within a reasonable timeframe, except where we need to retain it for legal purposes.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              BFFlix is not intended for children under 13. We do not knowingly collect information
              from children under 13. If we become aware that a child under 13 has provided us with
              personal data, we will take steps to delete that information.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>9. Cookies and Tracking</Text>
            <Text style={styles.paragraph}>
              We use cookies and similar technologies to improve your experience, analyze usage, and
              provide personalized content. You can control cookie preferences through your device
              settings.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
            <Text style={styles.paragraph}>
              BFFlix may contain links to third-party services (e.g., streaming platforms). We are
              not responsible for the privacy practices of these third parties. Please review their
              privacy policies separately.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>11. Changes to Privacy Policy</Text>
            <Text style={styles.paragraph}>
              We may update this privacy policy from time to time. We will notify you of significant
              changes by email or through the app. Your continued use after changes indicates
              acceptance of the updated policy.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionTitle}>12. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have questions or concerns about this privacy policy or our data practices,
              please contact us through the app or visit our support page.
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
