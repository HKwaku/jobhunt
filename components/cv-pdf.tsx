// Fixed-layout CV PDF that mirrors the candidate's existing CV styling:
// centred name, ruled section headers, a left date gutter with right-aligned
// locations, and bullet / sub-bullet hierarchy. Helvetica (built in) keeps it
// dependency-free. Loaded only client-side via dynamic import.
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { TailoredCv } from "@/lib/types";

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111111",
    lineHeight: 1.32,
  },
  name: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contact: {
    textAlign: "center",
    fontSize: 8.5,
    color: "#333333",
    marginTop: 3,
  },
  summary: { marginTop: 9, textAlign: "justify" },

  sectionHeader: {
    marginTop: 11,
    marginBottom: 4,
    paddingBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderBottomWidth: 0.8,
    borderBottomColor: "#000000",
  },

  headerRow: { flexDirection: "row", marginTop: 6 },
  dateCol: { width: 66, fontSize: 8.5, color: "#222222" },
  orgCol: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  locCol: { fontSize: 8.5, textAlign: "right", color: "#222222" },

  body: { marginLeft: 66, marginTop: 1 },
  roleTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 2 },

  capRow: { marginBottom: 4 },
  capLabel: { fontFamily: "Helvetica-Bold" },

  bulletRow: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 11 },
  bulletText: { flex: 1 },
  subRow: { flexDirection: "row", marginBottom: 1.5, marginLeft: 12 },
});

function Bullets({ bullets }: { bullets: TailoredCv["experience"][number]["bullets"] }) {
  return (
    <View>
      {(bullets ?? []).map((b, i) => (
        <View key={i}>
          <View style={s.bulletRow}>
            <Text style={s.bulletDot}>{"•"}</Text>
            <Text style={s.bulletText}>{b.text}</Text>
          </View>
          {(b.sub ?? []).map((sub, j) => (
            <View key={j} style={s.subRow}>
              <Text style={s.bulletDot}>o</Text>
              <Text style={s.bulletText}>{sub}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function CvDoc({ cv }: { cv: TailoredCv }) {
  return (
    <Document
      title={`CV - ${cv.name}`}
      author={cv.name}
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{cv.name}</Text>
        <Text style={s.contact}>{cv.contactLine}</Text>

        {cv.summary ? <Text style={s.summary}>{cv.summary}</Text> : null}

        {cv.education?.length ? (
          <>
            <Text style={s.sectionHeader}>Education</Text>
            {cv.education.map((e, i) => (
              <View key={i}>
                <View style={s.headerRow}>
                  <Text style={s.dateCol}>{e.dateRange ?? ""}</Text>
                  <Text style={s.orgCol}>{e.institution}</Text>
                  {e.location ? <Text style={s.locCol}>{e.location}</Text> : null}
                </View>
                {e.detail ? <Text style={s.body}>{e.detail}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {cv.capabilities?.length ? (
          <>
            <Text style={s.sectionHeader}>Core Capabilities</Text>
            {cv.capabilities.map((c, i) => (
              <Text key={i} style={s.capRow}>
                <Text style={s.capLabel}>{c.label}: </Text>
                {c.text}
              </Text>
            ))}
          </>
        ) : null}

        {cv.experience?.length ? (
          <>
            <Text style={s.sectionHeader}>Experience</Text>
            {cv.experience.map((x, i) => (
              <View key={i} wrap={false}>
                <View style={s.headerRow}>
                  <Text style={s.dateCol}>{x.dateRange ?? ""}</Text>
                  <Text style={s.orgCol}>{x.company}</Text>
                  {x.location ? <Text style={s.locCol}>{x.location}</Text> : null}
                </View>
                <View style={s.body}>
                  {x.title ? <Text style={s.roleTitle}>{x.title}</Text> : null}
                  <Bullets bullets={x.bullets} />
                </View>
              </View>
            ))}
          </>
        ) : null}

        {cv.certifications ? (
          <>
            <Text style={s.sectionHeader}>Additional Certifications & Training</Text>
            <Text>{cv.certifications}</Text>
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function cvToBlob(cv: TailoredCv): Promise<Blob> {
  return pdf(<CvDoc cv={cv} />).toBlob();
}
