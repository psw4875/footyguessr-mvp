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

export default function DailyChallengeLanding() {
  const router = useRouter();

  // Mini FAQ Schema for Daily Challenge
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the FootyGuessr Daily Challenge?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Daily Challenge is a special daily game mode where all players worldwide face the same set of match puzzles each day. You get one attempt per day to complete the challenge and earn a score that will be ranked against other players on the global leaderboard."
        }
      },
      {
        "@type": "Question",
        "name": "How often does the Daily Challenge reset?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Daily Challenge resets at midnight UTC every day. Once you complete the challenge, you must wait until the next day to play again. This creates a fair and level playing field for all participants worldwide."
        }
      },
      {
        "@type": "Question",
        "name": "Can I retake the Daily Challenge if I'm not happy with my score?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, you can only submit your score once per day. However, your best score is recorded and displayed on the leaderboard. Make sure you're confident in your answers before submitting to maximize your ranking."
        }
      }
    ]
  };

  return (
    <>
      <MetaHead
        title="Daily Football Quiz Challenge - Compete on Global Leaderboards"
        description="Play FootyGuessr's Daily Challenge! Test your football knowledge with daily match puzzles and compete against players worldwide. One challenge per day, global leaderboard rankings."
        url="https://footyguessr.io/daily-challenge"
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>
      <Container maxW="container.lg" p={6}>
        <VStack spacing={8} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" mt={8}>
            <Heading as="h1" size="2xl" mb={3}>
              ⚽ Daily Football Challenge
            </Heading>
            <HStack justify="center" mb={4}>
              <Badge colorScheme="green" variant="solid" fontSize="md">
                One Challenge Per Day
              </Badge>
              <Badge colorScheme="blue" variant="solid" fontSize="md">
                Global Leaderboard
              </Badge>
            </HStack>
            <Text fontSize="xl" color="gray.700" maxW="800px" mx="auto">
              Test your football knowledge every day and compete with players around the world on our global leaderboard.
            </Text>
          </Box>

          {/* Description */}
          <Box maxW="800px" mx="auto">
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              The FootyGuessr Daily Challenge is the ultimate competitive football quiz experience. Every single day, at midnight UTC, a new set of iconic football match photos is released. All players worldwide face the exact same puzzles, creating a fair and exciting competition across all time zones.
            </Text>
            <Text fontSize="lg" mb={4} lineHeight="1.8">
              Unlike Solo mode where you can play unlimited rounds, the Daily Challenge gives you exactly one attempt per calendar day. This makes every guess count and adds a layer of strategic thinking to your answers. Your final score is instantly compared against millions of other players, placing you on our real-time global leaderboard.
            </Text>
            <Text fontSize="lg" lineHeight="1.8">
              Whether you're an occasional football fan or a true knowledge expert, the Daily Challenge is your chance to prove your expertise and climb the global rankings. The challenge resets daily, so you always have a fresh opportunity to beat your personal best and topple the competition.
            </Text>
          </Box>

          {/* Why Play Daily Challenge */}
          <Box bg="gray.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Why Play the Daily Challenge?
            </Heading>
            <UnorderedList spacing={3} fontSize="lg" stylePosition="inside">
              <ListItem>
                <strong>Fair Competition:</strong> Everyone plays the same puzzles each day—no advantage from experience or grinding
              </ListItem>
              <ListItem>
                <strong>Real-Time Leaderboard:</strong> See your ranking instantly and track how you compare globally
              </ListItem>
              <ListItem>
                <strong>Daily Motivation:</strong> Fresh content every 24 hours keeps the challenge exciting
              </ListItem>
              <ListItem>
                <strong>Strategic Depth:</strong> One attempt means every answer matters—test your true knowledge under pressure
              </ListItem>
              <ListItem>
                <strong>Community Connection:</strong> Compete with the worldwide FootyGuessr community
              </ListItem>
              <ListItem>
                <strong>Curated Content:</strong> Each day features carefully selected iconic football moments from history
              </ListItem>
            </UnorderedList>
          </Box>

          {/* How It Works */}
          <Box maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
              How the Daily Challenge Works
            </Heading>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading as="h3" size="md" mb={2}>
                  1. Play Once Per Day
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Access the Daily Challenge and face a set of match photo puzzles. You have one opportunity to submit your answers. Make them count!
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  2. Earn Your Score
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Just like other modes, you earn +5 points for identifying both teams correctly and +10 points for nailing the exact final score. Your total becomes your daily submission.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  3. Climb the Global Leaderboard
                </Heading>
                <Text color="gray.700" fontSize="md">
                  Your score is instantly ranked against all other players worldwide. Check the leaderboard to see your global position and compete against the best.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  4. Come Back Tomorrow
                </Heading>
                <Text color="gray.700" fontSize="md">
                  The challenge resets at midnight UTC. Return tomorrow for a completely new set of puzzles and another chance to prove your football knowledge.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Scoring Tips */}
          <Box bg="blue.50" p={6} borderRadius="lg" maxW="800px" mx="auto">
            <Heading as="h2" size="lg" mb={4}>
              Scoring Tips for the Daily Challenge
            </Heading>
            <UnorderedList spacing={3} fontSize="md" stylePosition="inside" color="gray.800">
              <ListItem>
                <strong>Know Your Teams:</strong> Familiarize yourself with team names, badges, and kit colors from different eras
              </ListItem>
              <ListItem>
                <strong>Iconic Moments Matter:</strong> The most famous matches and tournaments are featured most often
              </ListItem>
              <ListItem>
                <strong>Score Prediction:</strong> While tougher, correct score guesses double your points—they're worth the effort
              </ListItem>
              <ListItem>
                <strong>Take Your Time:</strong> Unlike Solo mode, there's no timer on Daily Challenge—answer carefully
              </ListItem>
              <ListItem>
                <strong>Study Football History:</strong> World Cups, Champions League finals, and legendary derbies appear frequently
              </ListItem>
            </UnorderedList>
          </Box>

          {/* CTA Button */}
          <Box textAlign="center" my={8}>
            <Heading as="h2" size="lg" mb={6}>
              Ready to Take Today's Challenge?
            </Heading>
            <Button
              colorScheme="green"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=single&daily=1")}
            >
              🏆 Play Daily Challenge Now
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
                  What is the FootyGuessr Daily Challenge?
                </Heading>
                <Text color="gray.700">
                  The Daily Challenge is a special daily game mode where all players worldwide face the same set of match puzzles each day. You get one attempt per day to complete the challenge and earn a score that will be ranked against other players on the global leaderboard.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  How often does the Daily Challenge reset?
                </Heading>
                <Text color="gray.700">
                  The Daily Challenge resets at midnight UTC every day. Once you complete the challenge, you must wait until the next day to play again. This creates a fair and level playing field for all participants worldwide.
                </Text>
              </Box>

              <Box>
                <Heading as="h3" size="md" mb={2}>
                  Can I retake the Daily Challenge if I'm not happy with my score?
                </Heading>
                <Text color="gray.700">
                  No, you can only submit your score once per day. However, your best score is recorded and displayed on the leaderboard. Make sure you're confident in your answers before submitting to maximize your ranking.
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Bottom CTA */}
          <Box textAlign="center" mt={8} mb={8}>
            <Text fontSize="lg" color="gray.700" mb={4}>
              Don't miss out on today's challenge—join thousands of players competing right now!
            </Text>
            <Button
              colorScheme="blue"
              size="lg"
              px={10}
              py={6}
              fontSize="lg"
              onClick={() => router.push("/game?mode=single&daily=1")}
            >
              🚀 Start Playing Today
            </Button>
          </Box>
        </VStack>
      </Container>
    </>
  );
}
