import {
  Container,
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  UnorderedList,
  ListItem,
  Divider,
  Badge,
} from "@chakra-ui/react";
import Head from "next/head";
import MetaHead from "../components/MetaHead";
import { useRouter } from "next/router";

export default function PvpBattlesLanding() {
  const router = useRouter();

  // Mini FAQ Schema for PvP Battles
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does PvP mode work in FootyGuessr?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PvP mode is a real-time 1v1 battle where two players compete head-to-head over 3 rounds. Both players face the same match photo and race to answer correctly. Points are awarded for identifying teams (+5) and exact scores (+10). Whoever scores the most points across all 3 rounds wins the match."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between Quick Match and Private Match?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Quick Match instantly pairs you with a random opponent from the player pool. Private Match lets you invite a friend via a unique code—perfect for friendly rivalries and practice sessions. Both use the same 3-round competition format."
        }
      },
      {
        "@type": "Question",
        "name": "Is there a time limit in PvP matches?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, each round has a countdown timer. You must submit your answer before time runs out. The timer creates competitive tension and rewards quick thinking while still allowing time to think strategically about your answer."
        }
      }
    ]
  };

  return (
    <>
      <MetaHead
        title="PvP Football Battles - Real-Time Multiplayer Quiz Duels"
        description="Challenge friends or random players in FootyGuessr's PvP Battles! Real-time 1v1 football match duels. Play Quick Matches or invite friends for private battles."
        url="https://footyguessr.io/pvp-battles"
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>
      <Container maxW="container.lg" p={6}>
        <VStack spacing={8} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" mt={8}>
            <Heading as="h1" size="2xl" mb={3}>
              ⚔️ PvP Football Battles
            </Heading>
            <HStack justify="center" mb={4}>
              <Badge colorScheme="orange" variant="solid" fontSize="md">
                Real-Time Multiplayer
              </Badge>
              <Badge colorScheme="purple" variant="solid" fontSize="md">
                1v1 Competitive
              </Badge>
            </HStack>
            <Text fontSize="xl" color="gray.700" maxW="800px" mx="auto">
              Challenge players worldwide or invite friends in intense real-time football match duels.
            </Text>
          </Box>

          {/* Description */}
          <Box maxW="800px" mx="auto">
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              PvP Battles transform FootyGuessr into a thrilling competitive sport. Face off against other players in real-time 1v1 matches where every answer matters. You and your opponent see the same iconic football match photo and race to identify the teams and exact score. The faster and more accurate you are, the higher your score—and the better your chances of winning.
            </Text>
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              Each PvP match consists of 3 intense rounds. You earn +5 points for correctly naming both teams and +10 points for predicting the exact final score. After all 3 rounds, whoever has accumulated the most points wins the match. Whether you're facing a random opponent in a Quick Match or battling a friend in a Private Match, PvP offers the ultimate test of football knowledge under pressure.
            </Text>
            <Text fontSize="lg" lineHeight="1.8">
              The competitive pressure is real—you have a time limit each round, and your opponent can see when you submit your answer. Will you crack under the time constraint, or will you deliver accurate answers faster than your rival? PvP Battles are where FootyGuessr legends are made.
            </Text>
          </Box>

          {/* Game Modes */}
          <Box bg="gray.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Two Ways to Play PvP
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2} color="orange.600">
                  🎲 Quick Match
                </Heading>
                <Text color="gray.700">
                  Instantly matched with a random opponent from the global player pool. Perfect for testing your skills against unknown opponents and experiencing the unpredictability of competitive play.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2} color="purple.600">
                  👥 Private Match
                </Heading>
                <Text color="gray.700">
                  Invite a specific friend using a unique match code. Play friendly rivalries, organize tournaments with friends, or practice against known competitors. Great for team building and regular competitive sessions.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Strategy Tips */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              PvP Strategy & Tips
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Master the Timing
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Don't rush! While speed matters, accuracy is crucial. Study the match photo carefully—look for team colors, kit designs, stadium details—before submitting. A correct answer beats a hasty guess every time.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Learn Team Identities
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Memorize classic team colors, badge styles, and sponsor patterns across different eras. Many matches feature distinctive uniforms that make identification easier.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Go for the High Scores
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Correct scores are worth double (+10 vs +5). If you can confidently identify both teams, take an educated guess on the score. The extra points could win you the match.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Study Football History
                </Heading>
                <Text color="gray.700" fontSize="md">
                  The matches featured are iconic moments from football history—World Cup finals, Champions League classics, historic derbies. Brush up on your football knowledge between matches.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Stay Calm Under Pressure
                </Heading>
                <Text color="gray.700" fontSize="md">
                  The real-time nature of PvP adds pressure, but staying focused is key. Take deep breaths, trust your knowledge, and don't let the timer force you into careless mistakes.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Why Play PvP */}
          <Box bg="orange.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Why PvP Battles Are Addictive
            </Heading>
            <UnorderedList spacing={3} fontSize="md" stylePosition="inside" color="gray.800">
              <ListItem>
                <strong>Real-Time Intensity:</strong> Live matches where your opponent can see your every move
              </ListItem>
              <ListItem>
                <strong>Direct Competition:</strong> Win or lose—it's immediate and unambiguous
              </ListItem>
              <ListItem>
                <strong>Instant Feedback:</strong> See how you compare to your opponent round-by-round
              </ListItem>
              <ListItem>
                <strong>Challenge Friends:</strong> Play against people you know and climb the ranks together
              </ListItem>
              <ListItem>
                <strong>Variety:</strong> Every opponent brings unique knowledge and play styles
              </ListItem>
              <ListItem>
                <strong>Build Rivalries:</strong> Rematch friends and settle the score in epic football knowledge battles
              </ListItem>
            </UnorderedList>
          </Box>

          {/* CTA Button */}
          <Box textAlign="center" my={8}>
            <Heading as="h2" size="lg" mb={6}>
              Ready for Battle?
            </Heading>
            <Button
              colorScheme="orange"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=pvp")}
            >
              ⚔️ Start a PvP Battle Now
            </Button>
          </Box>

          <Divider my={4} />

          {/* FAQ Section */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              Frequently Asked Questions
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  How does PvP mode work in FootyGuessr?
                </Heading>
                <Text color="gray.700">
                  PvP mode is a real-time 1v1 battle where two players compete head-to-head over 3 rounds. Both players face the same match photo and race to answer correctly. Points are awarded for identifying teams (+5) and exact scores (+10). Whoever scores the most points across all 3 rounds wins the match.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  What's the difference between Quick Match and Private Match?
                </Heading>
                <Text color="gray.700">
                  Quick Match instantly pairs you with a random opponent from the player pool. Private Match lets you invite a friend via a unique code—perfect for friendly rivalries and practice sessions. Both use the same 3-round competition format.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Is there a time limit in PvP matches?
                </Heading>
                <Text color="gray.700">
                  Yes, each round has a countdown timer. You must submit your answer before time runs out. The timer creates competitive tension and rewards quick thinking while still allowing time to think strategically about your answer.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Bottom CTA */}
          <Box textAlign="center" mt={8} mb={8}>
            <Text fontSize="lg" color="gray.700" mb={4}>
              Prove your football knowledge in head-to-head competition. Challenge a friend or test yourself against a random opponent!
            </Text>
            <Button
              colorScheme="purple"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=pvp")}
            >
              🚀 Play PvP Now
            </Button>
          </Box>
        </VStack>
      </Container>
    </>
  );
}
