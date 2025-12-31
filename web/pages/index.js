import {
  Container,
  Box,
  Button,
  Input,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
} from "@chakra-ui/react";
import { socket } from "../lib/socket";
import MetaHead from "../components/MetaHead";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Disconnected"); // Default to disconnected, will update on connect

  useEffect(() => {
    const onConnect = () => setStatus("Connected");
    const onDisconnect = () => setStatus("Disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Initial check for connection status
    if (socket.connected) setStatus("Connected");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const startSingle = () => {
    router.push("/game?mode=single");
  };

  const [dailyStatus, setDailyStatus] = useState({ played: false, score: null });

  useEffect(() => {
    try {
      const dk = new Date().toISOString().slice(0, 10);
      const key = `fta_daily_${dk}`;
      const raw = localStorage.getItem(key);
      if (raw) setDailyStatus({ played: true, score: Number(raw) });
      else setDailyStatus({ played: false, score: null });
    } catch (e) {}
  }, []);

  const startPvpLobby = () => {
    // PVP 로비로 이동 (닉네임은 game.js 로비에서 직접 입력)
    router.push(`/game?mode=pvp&name=${encodeURIComponent(name)}`);
  };

  return (
    <>
      <MetaHead
        title="FootyGuessr – Guess Legendary Football Matches"
        description="Guess legendary football matches, World Cups, and iconic football moments in one photo."
        url="https://footyguessr.io/"
      />
      <Container maxW="container.md" p={4}>
        <VStack spacing={6} align="stretch">
          {/* SEO Hero Section */}
          <Box textAlign="center" mt={8} mb={4}>
            <Heading as="h1" size="2xl" mb={3}>
            FootyGuessr – Football Guessing Game
          </Heading>
          <Text fontSize="md" color="gray.700" mb={4}>
            FootyGuessr is a football guessing game where you guess legendary matches, World Cups, and iconic football moments.
          </Text>
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="blue.50">
          <Heading as="h2" size="md" mb={3}>
            How to Play
          </Heading>
          <VStack align="start" spacing={2}>
            <Text fontSize="sm">• Look at the match image</Text>
            <Text fontSize="sm">• Guess the teams, score, and tournament</Text>
            <Text fontSize="sm">• Get scored and compete</Text>
          </VStack>
        </Box>

        <Box textAlign="center">
          <Heading as="h2" size="md" mb={2}>
            Play Now
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Test your football knowledge instantly.
          </Text>
        </Box>

        {/* Daily Challenge: Primary CTA */}
        <Box p={5} borderWidth="2px" borderRadius="lg" bg={dailyStatus.played ? 'gray.50' : 'orange.50'} borderColor={dailyStatus.played ? 'gray.300' : 'orange.400'} boxShadow="md">
          <VStack spacing={3} align="stretch">
            <Heading size="lg" mb={0}>🔥 Daily Challenge</Heading>
            <Text fontSize="sm" color="gray.700">Same puzzle every day for everyone.</Text>
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" color="gray.700" fontWeight="500">
                {dailyStatus.played ? '✓ Completed today' : 'Beat the global leaderboard'}
              </Text>
            </VStack>
            <Button 
              colorScheme={dailyStatus.played ? 'gray' : 'orange'} 
              w="100%" 
              size="lg" 
              onClick={() => router.push('/game?mode=single&daily=1')} 
              fontWeight="bold"
              fontSize="md"
              py={6}
              isDisabled={false}
            >
              {dailyStatus.played ? `✓ Completed (${dailyStatus.score ?? '-'} pts)` : '🏆 Start Daily Challenge'}
            </Button>
            {dailyStatus.played && (
              <Button 
                variant="outline" 
                w="100%" 
                size="md" 
                onClick={() => router.push('/game?mode=single&daily=1&leaderboard=1')}
              >
                📊 View Today’s Leaderboard
              </Button>
            )}
          </VStack>
        </Box>

        {/* Nickname Input + Other Modes */}
        <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
          <VStack spacing={4} align="stretch">
            <Heading as="h2" size="md">Practice</Heading>
            <FormControl>
              <FormLabel htmlFor="nickname">Nickname <Text as="span" color="red.500">*</Text></FormLabel>
              <Input
                id="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                size="lg"
              />
              <FormHelperText fontSize="sm">Shown in PvP and leaderboards.</FormHelperText>
            </FormControl>

            <Button 
              colorScheme="green" 
              size="lg" 
              w="100%" 
              onClick={startSingle} 
              fontWeight="bold" 
              fontSize="md" 
              py={6}
            >
              🎮 Start 60s Rush
            </Button>
            <Button 
              colorScheme="teal" 
              size="md" 
              w="100%" 
              onClick={startPvpLobby}
              variant="outline"
            >
              Play PvP
            </Button>
          </VStack>
        </Box>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Status: {status}
        </Text>
      </VStack>
      </Container>
    </>
  );
}
