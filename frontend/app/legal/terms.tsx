import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, fonts, fontScale } from "@/src/theme";

const SECTIONS: { h: string; b: string }[] = [
  { h: "1. Geltungsbereich & Anbieter", b: "Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der mobilen Applikation und aller damit verbundenen Dienste „Sugar“ (nachfolgend „App“ oder „Dienst“), betrieben von Yunus Emre Kara, Castroper Straße 82, 44357 Dortmund, Deutschland (nachfolgend „Anbieter“, „wir“). Mit der Registrierung, dem Zugriff auf oder der Nutzung der App erklärst du dich mit diesen AGB einverstanden. Abweichende Bedingungen des Nutzers finden keine Anwendung, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu." },
  { h: "2. Vertragsgegenstand", b: "Sugar ist eine Kommunikations- und Kennenlern-Plattform, die es volljährigen Nutzern ermöglicht, über Foto-Profile, Live-Video-Chats, Storys und Nachrichten miteinander in Kontakt zu treten. Der Anbieter schuldet ausschließlich die Bereitstellung der technischen Plattform und die Möglichkeit zur Kontaktaufnahme. Ein bestimmter Erfolg – insbesondere das Zustandekommen von Kontakten, Matches, Verabredungen oder Beziehungen – wird ausdrücklich nicht geschuldet." },
  { h: "3. Registrierung & Nutzerkonto", b: "Die Nutzung setzt eine Registrierung mit gültiger E-Mail-Adresse und einem selbst gewählten Passwort voraus. Der Nutzer ist verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten. Jeder Nutzer darf nur ein Konto führen. Die Zugangsdaten sind geheim zu halten und dürfen nicht an Dritte weitergegeben werden. Der Nutzer haftet für sämtliche Aktivitäten, die über sein Konto vorgenommen werden." },
  { h: "4. Mindestalter (18+)", b: "Die App ist ausschließlich für Personen ab 18 Jahren bestimmt. Mit der Nutzung bestätigst du verbindlich, dass du volljährig bist. Wir behalten uns vor, das Alter durch geeignete Maßnahmen (z. B. Alters-Gate, Verifizierung) zu überprüfen und Konten zu sperren, bei denen der begründete Verdacht besteht, dass der Nutzer minderjährig ist." },
  { h: "5. Verhaltensregeln & Zero-Tolerance", b: "Es gilt eine strikte Null-Toleranz-Politik gegenüber anstößigen Inhalten und missbräuchlichem Verhalten. Untersagt sind insbesondere: Nacktheit und sexuell explizite Inhalte; Belästigung, Mobbing, Hassrede, Diskriminierung und Bedrohungen; Gewaltdarstellungen; die Darstellung, Anbahnung oder Bewerbung sexueller Handlungen gegen Entgelt (Prostitution/Escort); der Handel mit oder die Bewerbung von Waffen, Drogen oder illegalen Waren; Betrug, „Romance-Scamming“, Phishing und das Erbetteln von Geld; Spam und kommerzielle Werbung; sowie jede Form von Inhalten, die Minderjährige gefährden. Verstöße führen zur sofortigen und dauerhaften Sperrung." },
  { h: "6. Nutzergenerierte Inhalte (UGC)", b: "Der Nutzer ist allein verantwortlich für alle von ihm hochgeladenen Inhalte (Fotos, Storys, Texte, Video- und Audioübertragungen). Er sichert zu, dass er über alle erforderlichen Rechte an diesen Inhalten verfügt und keine Rechte Dritter (insb. Urheber-, Persönlichkeits- oder Markenrechte) verletzt. Hochgeladene Bilder werden automatisiert auf unzulässige Inhalte geprüft; unangemessene Inhalte werden abgelehnt oder entfernt." },
  { h: "7. Rechteeinräumung", b: "Der Nutzer räumt dem Anbieter ein einfaches, räumlich und zeitlich auf die Dauer der Bereitstellung beschränktes, unentgeltliches Recht ein, die eingestellten Inhalte zum Zweck des Betriebs, der Darstellung und der Bereitstellung des Dienstes zu speichern, technisch zu bearbeiten (z. B. Skalierung, Komprimierung) und anderen Nutzern im Rahmen der gewählten Sichtbarkeit anzuzeigen. Mit Löschung der Inhalte oder des Kontos endet dieses Recht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen." },
  { h: "8. Sichtbarkeit von Storys", b: "Für Storys kann der Nutzer die Sichtbarkeit selbst festlegen: „Öffentlich“, „Nur Matches“ oder „Privat“. Die Sichtbarkeit kann jederzeit geändert werden. Der Anbieter übernimmt keine Gewähr dafür, dass Inhalte, die anderen Nutzern angezeigt wurden, nicht von diesen kopiert, gespeichert oder weiterverbreitet werden." },
  { h: "9. Melden & Blockieren", b: "Jeder Nutzer kann andere Nutzer melden oder blockieren. Blockierte Personen werden nicht mehr angezeigt oder zugeordnet. Meldungen werden grundsätzlich innerhalb von 24 Stunden geprüft. Der Anbieter behält sich vor, gemeldete Inhalte zu entfernen und Konten vorläufig oder dauerhaft zu sperren. Ein Anspruch auf Wiederherstellung gesperrter Konten oder gelöschter Inhalte besteht nicht." },
  { h: "10. Live-Video-Chat", b: "Der Live-Video-Dienst ermöglicht die direkte Bild- und Tonübertragung zwischen Nutzern. Es ist verboten, Übertragungen ohne Einwilligung des anderen Nutzers aufzuzeichnen, mitzuschneiden, per Screenshot festzuhalten oder zu verbreiten. Der Anbieter kann Live-Übertragungen zur Sicherheit und zur Durchsetzung dieser AGB stichprobenartig oder anlassbezogen überwachen." },
  { h: "11. Abonnements & Preise", b: "Sugar bietet ein kostenloses Basispaket sowie kostenpflichtige Abonnements (u. a. „Sugar Plus“, „Sugar Gold“, „Sugar VIP“) mit erweitertem Funktionsumfang. Live-Video ist ab „Sugar Plus“ enthalten. In der aktuellen Vorschauversion erfolgt keine echte Abbuchung (Testmodus). Sobald echte Zahlungen aktiviert sind, gelten die im Bestellprozess angezeigten Preise inkl. gesetzlicher Umsatzsteuer sowie die dortigen Zahlungs- und Abrechnungsbedingungen." },
  { h: "12. Laufzeit, Verlängerung & Kündigung von Abos", b: "Abonnements verlängern sich – sofern im Bestellprozess so angegeben – automatisch um die jeweils gewählte Laufzeit, wenn sie nicht rechtzeitig gekündigt werden. Die Kündigung ist jederzeit zum Ende der laufenden Abrechnungsperiode möglich, u. a. über die Verwaltungsfunktionen des jeweiligen App-Stores bzw. in den Einstellungen. Bereits gezahlte Entgelte für laufende Perioden werden nicht anteilig erstattet, soweit gesetzlich zulässig." },
  { h: "13. Widerrufsrecht", b: "Verbrauchern steht bei kostenpflichtigen digitalen Diensten grundsätzlich ein 14-tägiges Widerrufsrecht zu. Mit der ausdrücklichen Zustimmung des Nutzers zum sofortigen Beginn der Leistung und der Bestätigung, dass ihm das Erlöschen des Widerrufsrechts bekannt ist, erlischt das Widerrufsrecht mit vollständiger Erbringung der Leistung. Einzelheiten ergeben sich aus der gesonderten Widerrufsbelehrung im Bestellprozess." },
  { h: "14. Verfügbarkeit & Änderungen", b: "Der Anbieter ist bemüht, den Dienst mit hoher Verfügbarkeit bereitzustellen, schuldet jedoch keine ununterbrochene Verfügbarkeit. Wartungsarbeiten, Störungen, höhere Gewalt oder technische Weiterentwicklungen können zu vorübergehenden Einschränkungen führen. Der Anbieter darf Funktionen jederzeit ändern, erweitern oder einstellen, soweit dies für den Nutzer zumutbar ist." },
  { h: "15. Pflichten des Nutzers", b: "Der Nutzer verpflichtet sich, die App nur im Einklang mit geltendem Recht und diesen AGB zu nutzen, keine Schadsoftware zu verbreiten, keine automatisierten Verfahren (Bots, Scraping) einzusetzen, Sicherheitsmechanismen nicht zu umgehen und personenbezogene Daten anderer Nutzer nicht außerhalb des Dienstes zu verarbeiten oder zu veröffentlichen." },
  { h: "16. Sperrung & Kündigung durch den Anbieter", b: "Bei Verstößen gegen diese AGB, gesetzlichen Vorgaben oder bei begründetem Missbrauchsverdacht kann der Anbieter Inhalte entfernen sowie Konten verwarnen, vorübergehend oder dauerhaft sperren und das Nutzungsverhältnis fristlos kündigen. Schwere Verstöße (z. B. Inhalte, die Minderjährige gefährden, oder strafbare Handlungen) werden den zuständigen Behörden gemeldet." },
  { h: "17. Kontolöschung durch den Nutzer", b: "Der Nutzer kann sein Konto jederzeit und ohne Angabe von Gründen unwiderruflich in den Einstellungen löschen. Dabei werden Profil, Fotos, Storys, Matches und Nachrichten dauerhaft entfernt, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen." },
  { h: "18. Haftung", b: "Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht) und begrenzt auf den vertragstypischen, vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen. Der Anbieter haftet nicht für das Verhalten anderer Nutzer, für die Richtigkeit von Profilangaben oder für außerhalb der Plattform getroffene Verabredungen." },
  { h: "19. Sicherheit beim Kennenlernen", b: "Nutzer handeln beim Kontakt mit anderen Personen eigenverantwortlich. Wir empfehlen dringend, persönliche Daten (Adresse, Finanzdaten) nicht vorschnell preiszugeben, erste Treffen an öffentlichen Orten zu vereinbaren und Vertrauenspersonen zu informieren. Überweise niemals Geld an Kontakte aus der App." },
  { h: "20. Datenschutz", b: "Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, die Bestandteil dieser Nutzung ist. Details zu Art, Umfang und Zweck der Datenverarbeitung sowie zu den Rechten der betroffenen Personen sind dort geregelt." },
  { h: "21. Änderungen dieser AGB", b: "Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern, sofern dies aus triftigen Gründen (z. B. Gesetzesänderungen, neue Funktionen) erforderlich ist. Über wesentliche Änderungen wird der Nutzer in geeigneter Form (z. B. In-App-Hinweis) informiert. Widerspricht der Nutzer nicht innerhalb der genannten Frist und nutzt den Dienst weiter, gelten die geänderten Bedingungen als angenommen." },
  { h: "22. Schlussbestimmungen", b: "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Ist der Nutzer Verbraucher, bleiben zwingende Verbraucherschutzvorschriften seines Aufenthaltsstaates unberührt. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt." },
  { h: "23. Kontakt", b: "Yunus Emre Kara, Castroper Straße 82, 44357 Dortmund, Deutschland. E-Mail: support@sugar.app" },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="terms-back" onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Nutzungsbedingungen (AGB)</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Zuletzt aktualisiert: Juni 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.b}>{s.b}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { padding: 2 },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  updated: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary },
  section: { gap: spacing.xs },
  h: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  b: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
});
