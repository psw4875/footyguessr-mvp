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
} from "@chakra-ui/react";
import Head from "next/head";
import MetaHead from "../components/MetaHead";
import { useRouter } from "next/router";

export default function FootballQuizLanding() {
  const router = useRouter();

  // FAQ Schema markup for rich snippets
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I play FootyGuessr?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each round shows you a photo from a famous football match. Type in the two teams and optionally guess the final score. You earn +5 points for correct teams and +10 points for an exact score match. The faster you answer, the more you can score."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between Solo and PvP modes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Solo mode gives you 60 seconds to answer as many questions as possible with adaptive difficulty. PvP mode is a real-time 1v1 battle where you compete against another player over 3 rounds—whoever scores the most points wins."
        }
      },
      {
        "@type": "Question",
        "name": "What is the Daily Challenge?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every day, all players worldwide get the same set of match puzzles. Complete it once per day and see how you rank on the global leaderboard. It's a great way to test your skills against the community."
        }
      },
      {
        "@type": "Question",
        "name": "Is FootyGuessr free to play?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! FootyGuessr is completely free. No downloads, no sign-ups required for casual play. Just visit the site and start guessing matches immediately."
        }
      },
      {
        "@type": "Question",
        "name": "What types of matches are featured?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our database includes World Cup finals and key matches, Champions League finals, international tournaments, historic club matches, and iconic football moments spanning multiple decades and competitions."
        }
      },
      {
        "@type": "Question",
        "name": "Can I play on mobile?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely! FootyGuessr works on all devices—desktop, tablet, and mobile. The interface is fully responsive and optimized for touch screens."
        }
      }
    ]
  };

  return (
    <>
      <MetaHead
        title="Football Quiz Game: Guess Iconic Soccer Matches"
        description="Challenge yourself with our free football trivia quiz! Identify legendary matches, World Cup finals, and historic moments from a single photo. Play solo, battle in PvP, or compete in daily challenges."
        url="https://footyguessr.io/football-quiz"
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>
      <Container maxW="container.lg" p={6}>
        <VStack spacing={8} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" mt={8}>
            <Heading as="h1" size="2xl" mb={4}>
              ⚽ Football Quiz: Guess Famous Matches
            </Heading>
            <Text fontSize="xl" color="gray.700" maxW="800px" mx="auto">
              Challenge your football knowledge in the ultimate online soccer quiz game.
            </Text>
          </Box>

          {/* Description */}
          <Box maxW="800px" mx="auto">
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              FootyGuessr is a fast-paced football trivia game where you identify iconic matches 
              from a single photo. Test your knowledge of World Cups, Champions League finals, 
              historic derbies, and unforgettable moments from football history.
            </Text>
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              Each round shows you a match photo—guess the two teams and the exact score to earn 
              maximum points. Play solo against the clock, challenge friends in real-time 1v1 battles, 
              or compete globally in the daily challenge where everyone faces the same puzzles.
            </Text>
            <Text fontSize="lg" lineHeight="1.8">
              Whether you're a casual fan or a football encyclopedia, FootyGuessr offers addictive 
              gameplay that tests your memory of the beautiful game's greatest moments.
            </Text>
          </Box>

          {/* Features */}
          <Box bg="gray.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Game Features
            </Heading>
            <UnorderedList spacing={3} fontSize="lg" stylePosition="inside">
              <ListItem>
                <strong>Solo Time-Attack:</strong> 60 seconds to guess as many matches as possible
              </ListItem>
              <ListItem>
                <strong>Real-Time PvP:</strong> Head-to-head 1v1 battles against other players
              </ListItem>
              <ListItem>
                <strong>Daily Challenge:</strong> Compete on global leaderboards with the same daily puzzles
              </ListItem>
              <ListItem>
                <strong>Iconic Matches:</strong> World Cups, Champions League finals, and legendary moments
              </ListItem>
              <ListItem>
                <strong>Fast Rounds:</strong> Quick gameplay sessions perfect for any schedule
              </ListItem>
              <ListItem>
                <strong>Smart Scoring:</strong> +5 points for teams, +10 for exact score predictions
              </ListItem>
            </UnorderedList>
          </Box>

          {/* CTA Buttons */}
          <HStack spacing={4} justify="center" flexWrap="wrap">
            <Button
              colorScheme="blue"
              size="lg"
              px={8}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=single")}
            >
              🎮 Play Solo Mode
            </Button>
            <Button
              colorScheme="orange"
              size="lg"
              px={8}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=pvp")}
            >
              ⚔️ Play PvP Mode
            </Button>
          </HStack>

          <Divider my={4} />

          {/* FAQ Section */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              Frequently Asked Questions
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  How do I play FootyGuessr?
                </Heading>
                <Text color="gray.700">
                  Each round shows you a photo from a famous football match. Type in the two teams 
                  and optionally guess the final score. You earn +5 points for correct teams and 
                  +10 points for an exact score match. The faster you answer, the more you can score.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  What's the difference between Solo and PvP modes?
                </Heading>
                <Text color="gray.700">
                  Solo mode gives you 60 seconds to answer as many questions as possible with adaptive 
                  difficulty. PvP mode is a real-time 1v1 battle where you compete against another 
                  player over 3 rounds—whoever scores the most points wins.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  What is the Daily Challenge?
                </Heading>
                <Text color="gray.700">
                  Every day, all players worldwide get the same set of match puzzles. Complete it once 
                  per day and see how you rank on the global leaderboard. It's a great way to test 
                  your skills against the community.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Is FootyGuessr free to play?
                </Heading>
                <Text color="gray.700">
                  Yes! FootyGuessr is completely free. No downloads, no sign-ups required for casual play. 
                  Just visit the site and start guessing matches immediately.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  What types of matches are featured?
                </Heading>
                <Text color="gray.700">
                  Our database includes World Cup finals and key matches, Champions League finals, 
                  international tournaments, historic club matches, and iconic football moments spanning 
                  multiple decades and competitions.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Can I play on mobile?
                </Heading>
                <Text color="gray.700">
                  Absolutely! FootyGuessr works on all devices—desktop, tablet, and mobile. The interface 
                  is fully responsive and optimized for touch screens.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Bottom CTA */}
          <Box textAlign="center" mt={8} mb={8}>
            <Heading as="h2" size="lg" mb={4}>
              Ready to Test Your Football Knowledge?
            </Heading>
            <Button
              colorScheme="green"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/")}
            >
              🚀 Start Playing Now
            </Button>
          </Box>
        </VStack>
      </Container>
    </>
  );
}
